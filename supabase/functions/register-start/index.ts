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
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const matric = String(body.matric ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!name || name.length < 3) return json({ error: "Enter your full name" }, 400);
    if (!/^\d{2}\/\d{2}[a-z]{3}\d{3}$/.test(matric)) return json({ error: "Invalid matric format (e.g. 21/08nus014)" }, 400);
    if (!/.+@.+\..+/.test(email)) return json({ error: "Invalid email" }, 400);

    // 1) Matric must exist in roster
    const { data: roster, error: rosterErr } = await admin
      .from("student_roster")
      .select("matric, name")
      .ilike("matric", matric)
      .maybeSingle();
    if (rosterErr) throw rosterErr;
    if (!roster) return json({ error: "This matric number is not on the eligible voter list. Contact the electoral committee." }, 404);

    // 2) Reject if already fully registered
    const { data: existingVoter } = await admin
      .from("voters")
      .select("id, verified, email")
      .eq("matric", matric)
      .maybeSingle();
    if (existingVoter?.verified) {
      return json({ error: "This matric number is already registered. Please log in instead." }, 409);
    }

    // 3) Check email not used by a *different* matric
    const { data: emailInUse } = await admin
      .from("voters")
      .select("matric, verified")
      .eq("email", email)
      .maybeSingle();
    if (emailInUse && emailInUse.matric !== matric && emailInUse.verified) {
      return json({ error: "This email is already registered with another matric number." }, 409);
    }

    // 4) Create/update registration_otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Invalidate any old pending rows for this matric/email
    await admin.from("registration_otp")
      .delete()
      .or(`matric.eq.${matric},email.eq.${email}`)
      .eq("verified", false);

    const { data: reg, error: insErr } = await admin
      .from("registration_otp")
      .insert({ name, matric, email, otp_code: otp, expires_at: expiresAt, last_sent_at: now, verified: false, attempts: 0 })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // 5) Send email
    const FROM = Deno.env.get("RESEND_FROM") ?? "NUNSA Elections <onboarding@resend.dev>";
    try {
      const send = await resend.emails.send({
        from: FROM,
        to: email,
        subject: "Your NUNSA Election Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color:#111;">NUNSA Election Verification</h1>
            <p>Hi ${escapeHtml(name)}, use the code below to verify your email:</p>
            <div style="background:#f4f4f4;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;margin:20px 0;">${otp}</div>
            <p>This code expires in ${OTP_TTL_MINUTES} minutes. Do not share it with anyone.</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #ddd;">
            <p style="color:#666;font-size:12px;">NUNSA Independent Student Electoral Committee</p>
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
      return json({ error: `Could not send the verification email: ${e?.message ?? "unknown"}` }, 502);
    }

    return json({ registrationId: reg.id, email, expiresInSeconds: OTP_TTL_MINUTES * 60 }, 200);
  } catch (err: any) {
    console.error("register-start error:", err);
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
