import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const OTP_TTL_MINUTES = 10;
const COOLDOWN_SECONDS = 45;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { registrationId } = await req.json();
    if (!registrationId) return json({ error: "registrationId required" }, 400);

    const { data: reg, error } = await admin
      .from("registration_otp")
      .select("*")
      .eq("id", registrationId)
      .maybeSingle();
    if (error) throw error;
    if (!reg) return json({ error: "Registration session not found. Start again." }, 404);
    if (reg.verified) return json({ error: "This code is already verified." }, 400);

    // Cooldown
    const last = new Date(reg.last_sent_at).getTime();
    const elapsed = (Date.now() - last) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      return json({ error: `Please wait ${Math.ceil(COOLDOWN_SECONDS - elapsed)}s before requesting another code.` }, 429);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { error: updErr } = await admin
      .from("registration_otp")
      .update({ otp_code: otp, expires_at: expiresAt, last_sent_at: now, attempts: 0, updated_at: now })
      .eq("id", registrationId);
    if (updErr) throw updErr;

    const FROM = Deno.env.get("RESEND_FROM") ?? "NUNSA Elections <onboarding@resend.dev>";
    try {
      const send = await resend.emails.send({
        from: FROM,
        to: reg.email,
        subject: "Your NUNSA Election Verification Code",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h1>NUNSA Election Verification</h1>
          <p>Your new verification code:</p>
          <div style="background:#f4f4f4;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;margin:20px 0;">${otp}</div>
          <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>
        </div>`,
      });
      console.log("Resend response:", JSON.stringify(send));
      if ((send as any)?.error) {
        const errObj = (send as any).error;
        const msg = errObj?.message ?? JSON.stringify(errObj);
        console.error("Resend returned error:", msg);
        return json({ error: `Email provider error: ${msg}` }, 502);
      }
    } catch (e: any) {
      console.error("Resend threw:", e?.message ?? e);
      return json({ error: `Could not resend the verification email: ${e?.message ?? "unknown"}` }, 502);
    }

    return json({ success: true, expiresInSeconds: OTP_TTL_MINUTES * 60 }, 200);
  } catch (err: any) {
    console.error("register-resend error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
