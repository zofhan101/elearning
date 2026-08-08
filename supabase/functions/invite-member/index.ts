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
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Caller client (to identify admin)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData.user;
    if (!caller) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Reserved for administrators" }, 403);

    const { email, full_name } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return json({ error: "Please provide a valid email address" }, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Send the invite. Supabase's built-in flow emails the person a link
    // to set their own password — the admin never sees or sets it.
    // The on_auth_user_created triggers automatically link this new
    // account to any existing placeholder personnel record that shares
    // this email address (see migration 20260807170000), preserving all
    // previously entered roster data and setting the matching app role.
    const origin = req.headers.get("origin");
    const redirectTo = origin ? `${origin}/reset-password` : undefined;

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { data: full_name ? { full_name } : undefined, redirectTo },
    );

    if (inviteErr) {
      return json({ error: inviteErr.message }, 400);
    }

    return json({ ok: true, user_id: invited?.user?.id ?? null });
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
