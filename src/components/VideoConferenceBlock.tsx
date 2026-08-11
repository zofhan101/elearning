import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

const loadedScripts = new Set<string>();
function loadJaasScript(appId: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (loadedScripts.has(appId)) {
    // Script tag already inserted, wait for it to finish loading
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.JitsiMeetExternalAPI) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }
  loadedScripts.add(appId);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://8x8.vc/${appId}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load the video service"));
    document.body.appendChild(script);
  });
}

export function VideoConferenceBlock({ blockId }: { blockId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-jitsi-jwt", {
          body: { content_block_id: blockId },
        });
        if (error || !data?.jwt) {
          let msg = (error as any)?.message ?? data?.error ?? "Unable to start video";
          try {
            const body = await (error as any)?.context?.json();
            if (body?.error) msg = body.error;
          } catch {
            // ignore parsing failure, fall back to generic message
          }
          throw new Error(msg);
        }

        setOpenUrl(`https://8x8.vc/${data.appId}/${data.room}?jwt=${encodeURIComponent(data.jwt)}`);

        await loadJaasScript(data.appId);
        if (cancelled || !containerRef.current) return;

        apiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", {
          roomName: `${data.appId}/${data.room}`,
          jwt: data.jwt,
          parentNode: containerRef.current,
          width: "100%",
          height: 500,
        });
        if (!cancelled) setStatus("ready");
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err.message ?? "Unable to start video");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      apiRef.current?.dispose?.();
      apiRef.current = null;
    };
  }, [blockId]);

  return (
    <div className="space-y-2">
      {openUrl && (
        <div className="flex justify-end">
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Open in new tab
          </a>
        </div>
      )}
      {status === "loading" && (
        <div className="h-[500px] rounded-md border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
          Connecting…
        </div>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md p-3">
          {errorMsg}
        </p>
      )}
      <div
        ref={containerRef}
        className={status === "ready" ? "rounded-md overflow-hidden border border-border" : "hidden"}
      />
    </div>
  );
}
