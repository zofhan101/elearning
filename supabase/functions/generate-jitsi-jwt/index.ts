import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pemToCryptoKey(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData.user;
    if (!caller) return json({ error: "Not authenticated" }, 401);

    const { content_block_id } = await req.json();
    if (!content_block_id || typeof content_block_id !== "string") {
      return json({ error: "Missing content_block_id" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Only mint a token if the caller can actually view this content block
    // (same rule that governs whether they can see it at all).
    const { data: canView, error: viewErr } = await admin.rpc("can_view_content_block", {
      _user_id: caller.id,
      _block_id: content_block_id,
    });
    if (viewErr) return json({ error: viewErr.message }, 500);
    if (!canView) return json({ error: "You do not have access to this session" }, 403);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "instructor"])
      .maybeSingle();
    const isModerator = !!roleRow;

    const { data: personnel } = await admin
      .from("personnel")
      .select("nom, prenom, email_institutionnel")
      .eq("id", caller.id)
      .maybeSingle();

    const appId = Deno.env.get("JAAS_APP_ID");
    const privateKeyPem = Deno.env.get("JAAS_PRIVATE_KEY");
    const kid = Deno.env.get("JAAS_KID");
    if (!appId || !privateKeyPem || !kid) {
      return json({ error: "Video conferencing is not configured yet" }, 500);
    }
    const cryptoKey = await pemToCryptoKey(privateKeyPem);

    const room = `hpp-${content_block_id.replace(/-/g, "")}`;
    const now = Math.floor(Date.now() / 1000);
    const displayName =
      [personnel?.prenom, personnel?.nom].filter(Boolean).join(" ") || caller.email || "Guest";

    const jwt = await create(
      { alg: "RS256", typ: "JWT", kid },
      {
        aud: "jitsi",
        iss: "chat",
        sub: appId,
        room,
        exp: now + 60 * 60 * 3,
        nbf: now - 10,
        context: {
          user: {
            name: displayName,
            email: personnel?.email_institutionnel ?? caller.email ?? "",
            moderator: isModerator,
          },
          features: {
            livestreaming: false,
            recording: false,
            transcription: false,
            "outbound-call": false,
          },
        },
      },
      cryptoKey,
    );

    return json({ jwt, appId, room });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
