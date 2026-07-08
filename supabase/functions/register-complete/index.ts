import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { registrationId, password } = await req.json();
    if (!registrationId) return json({ error: "registrationId required" }, 400);
    if (typeof password !== "string" || password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);

    const { data: reg, error } = await admin
      .from("registration_otp").select("*").eq("id", registrationId).maybeSingle();
    if (error) throw error;
    if (!reg) return json({ error: "Registration session not found." }, 404);
    if (!reg.verified) return json({ error: "Please verify the email code first." }, 400);

    // Ensure not already registered
    const { data: existingVerified } = await admin
      .from("voters").select("id, verified").eq("matric", reg.matric).maybeSingle();
    if (existingVerified?.verified) {
      return json({ error: "This matric is already registered. Please log in." }, 409);
    }

    // Create auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: reg.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: reg.name, matric: reg.matric },
    });
    if (authErr || !authUser?.user) {
      const msg = authErr?.message?.toLowerCase().includes("already") ? "This email is already in use." : (authErr?.message || "Could not create account");
      return json({ error: msg }, 400);
    }

    // Insert or update voter row
    let voterId: string | null = null;
    if (existingVerified?.id) {
      const { error: upErr } = await admin.from("voters").update({
        name: reg.name, email: reg.email, verified: true, auth_user_id: authUser.user.id,
      }).eq("id", existingVerified.id);
      if (upErr) {
        await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
        throw upErr;
      }
      voterId = existingVerified.id;
    } else {
      const { data: ins, error: insErr } = await admin.from("voters").insert({
        matric: reg.matric, name: reg.name, email: reg.email,
        verified: true, voted: false, auth_user_id: authUser.user.id,
      }).select("id").single();
      if (insErr) {
        await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
        throw insErr;
      }
      voterId = ins.id;
    }

    // Cleanup registration_otp row
    await admin.from("registration_otp").delete().eq("id", registrationId);

    return json({ success: true, voterId }, 200);
  } catch (err: any) {
    console.error("register-complete error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
});

function json(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });
}
