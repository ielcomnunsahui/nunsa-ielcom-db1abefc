import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const OTP_TTL_MINUTES = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { matric } = await req.json();
    const m = String(matric ?? "").trim().toLowerCase();
    if (!/^\d{2}\/\d{2}[a-z]{3}\d{3}$/.test(m)) {
      return json({ error: "Invalid matric format (e.g. 21/08nus014)" }, 400);
    }

    const { data: voter, error } = await admin
      .from("voters")
      .select("id, email, verified")
      .eq("matric", m)
      .maybeSingle();
    if (error) throw error;
    if (!voter) return json({ error: "No account found for this matric number." }, 404);
    if (!voter.verified) return json({ error: "Your registration is not verified yet." }, 403);

    // Invalidate any existing pending OTPs for this voter
    await admin.from("voter_otp").delete().eq("voter_id", voter.id).eq("verified", false);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { error: insErr } = await admin
      .from("voter_otp")
      .insert({ voter_id: voter.id, otp_code: otp, expires_at: expiresAt, last_sent_at: now, verified: false });
    if (insErr) throw insErr;

    const FROM = Deno.env.get("RESEND_FROM") ?? "NUNSA Elections <onboarding@resend.dev>";
    const send = await resend.emails.send({
      from: FROM,
      to: voter.email,
      subject: "NUNSA Election - Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color:#111;">Password Reset Request</h1>
          <p>Use the code below to reset your password:</p>
          <div style="background:#f4f4f4;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;margin:20px 0;">${otp}</div>
          <p>This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request this, ignore this email.</p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #ddd;">
          <p style="color:#666;font-size:12px;">NUNSA Independent Student Electoral Committee</p>
        </div>`,
    });
    if ((send as any)?.error) {
      const errObj = (send as any).error;
      const msg = errObj?.message ?? JSON.stringify(errObj);
      console.error("Resend error:", msg);
      return json({ error: `Email provider error: ${msg}` }, 502);
    }

    // Mask email for UX
    const masked = voter.email.replace(/(.).+(@.+)/, "$1***$2");
    return json({ email: masked, expiresInSeconds: OTP_TTL_MINUTES * 60 }, 200);
  } catch (err: any) {
    console.error("password-reset-start error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
});

function json(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: s });
}