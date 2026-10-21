import { supabase } from "@/integrations/supabase/client";

export interface CertificateResult {
  /** A certificate exists for this participant + module after the call. */
  issued: boolean;
  /** It was already there before this call (nothing new was generated). */
  alreadyExisted: boolean;
  /** Human-readable explanation when no certificate could be issued. */
  message?: string;
  /** True when the failure is technical (function error), not a rule outcome. */
  failed?: boolean;
}

const REASONS: Record<string, string> = {
  not_module_linked: "This assessment does not count toward a module certificate.",
  not_passing:
    "Your combined best score across this module's assessments is still below 80%, so no certificate was issued.",
  assessments_incomplete:
    "Other assessments of this module still need to be attempted before the certificate can be issued.",
};

/**
 * Asks the backend to issue the module validation certificate for a
 * submitted attempt. Safe to call repeatedly: the function is idempotent
 * and returns `alreadyExisted: true` when the certificate was issued before.
 *
 * Never throws — always resolves with a result the UI can display.
 */
export async function requestCertificate(attemptId: string): Promise<CertificateResult> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-module-certificate", {
      body: { attempt_id: attemptId },
    });

    if (error) {
      // supabase-js hides the JSON body of non-2xx answers behind
      // error.context (a Response). Read it to show the real reason.
      let message: string = error.message;
      try {
        const ctx = (error as any).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) message = String(body.error);
        }
      } catch {
        /* keep the generic message */
      }
      console.error("[certificate] function error:", message);
      return { issued: false, alreadyExisted: false, failed: true, message };
    }

    if (data?.issued) {
      return { issued: true, alreadyExisted: !!data.already_existed };
    }

    return {
      issued: false,
      alreadyExisted: false,
      message: REASONS[data?.reason] ?? "No certificate was issued for this attempt.",
    };
  } catch (e: any) {
    console.error("[certificate] unexpected error:", e);
    return {
      issued: false,
      alreadyExisted: false,
      failed: true,
      message: e?.message ?? "Could not reach the certificate service.",
    };
  }
}
