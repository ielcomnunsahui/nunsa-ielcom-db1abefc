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
    const { matric, otp, newPassword } = await req.json();
    const m = String(matric ?? "").trim().toLowerCase();
    const code = String(otp ?? "").trim();
    const pw = String(newPassword ?? "");

    if (!/^\d{2}\/\d{2}[a-z]{3}\d{3}$/.test(m)) return json({ error: "Invalid matric format" }, 400);
    if (!/^\d{6}$/.test(code)) return json({ error: "OTP must be 6 digits" }, 400);
    if (pw.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

    const { data: voter, error: vErr } = await admin
      .from("voters")
      .select("id, auth_user_id, email")
      .eq("matric", m)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!voter || !voter.auth_user_id) return json({ error: "Voter not found" }, 404);

    const { data: otpRow, error: otpErr } = await admin
      .from("voter_otp")
      .select("id, otp_code, expires_at, verified")
      .eq("voter_id", voter.id)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (otpErr) throw otpErr;
    if (!otpRow) return json({ error: "No pending reset request. Start again." }, 400);
    if (new Date(otpRow.expires_at as string) < new Date()) return json({ error: "Code expired. Request a new one." }, 400);
    if (otpRow.otp_code !== code) return json({ error: "Incorrect code" }, 400);

    const { error: updErr } = await admin.auth.admin.updateUserById(voter.auth_user_id, { password: pw });
    if (updErr) throw updErr;

    await admin.from("voter_otp").update({ verified: true }).eq("id", otpRow.id);

    return json({ ok: true, email: voter.email }, 200);
  } catch (err: any) {
    console.error("password-reset-complete error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
});

function json(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });
}