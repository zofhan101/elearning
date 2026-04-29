import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Caller client (to identify admin)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData.user;
    if (!caller) return json({ error: "Non authentifié" }, 401);

    // Admin client
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Réservé aux administrateurs" }, 403);

    const { request_id, action, admin_notes } = await req.json();
    if (!request_id || !["approve", "reject"].includes(action)) {
      return json({ error: "Paramètres invalides" }, 400);
    }

    const { data: reqRow, error: reqErr } = await admin
      .from("signup_requests")
      .select("*")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr || !reqRow) return json({ error: "Demande introuvable" }, 404);
    if (reqRow.status !== "pending") return json({ error: "Demande déjà traitée" }, 400);

    if (action === "reject") {
      await admin
        .from("signup_requests")
        .update({
          status: "rejected",
          admin_notes: admin_notes ?? null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: caller.id,
        })
        .eq("id", request_id);
      return json({ ok: true, action: "rejected" });
    }

    // Approve: create user with invite (sends magic link to set password)
    const redirectTo = req.headers.get("origin") ?? undefined;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      reqRow.email,
      {
        data: { full_name: reqRow.full_name },
        redirectTo,
      },
    );

    if (inviteErr) {
      // If already exists, treat as approved anyway
      if (!String(inviteErr.message ?? "").toLowerCase().includes("already")) {
        return json({ error: inviteErr.message }, 400);
      }
    }

    await admin
      .from("signup_requests")
      .update({
        status: "approved",
        admin_notes: admin_notes ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: caller.id,
      })
      .eq("id", request_id);

    return json({ ok: true, action: "approved", user_id: invited?.user?.id ?? null });
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
