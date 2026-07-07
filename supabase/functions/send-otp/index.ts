import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { voterId, email } = await req.json();

    if (!voterId || !email) {
      return new Response(
        JSON.stringify({ error: "voterId and email are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 1. Invalidate previous unverified OTPs for this voter
    const { error: invalidateError } = await supabaseAdmin
      .from("voter_otp")
      .update({ verified: true })
      .eq("voter_id", voterId)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString());

    if (invalidateError) {
      console.error("OTP invalidation error:", invalidateError);
      // continue execution (not fatal)
    }

    // 2. Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expiry time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3. Store OTP in database
    const { error: otpError } = await supabaseAdmin
      .from("voter_otp")
      .insert({
        voter_id: voterId,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false,
      });

    if (otpError) {
      console.error("OTP insert error:", otpError);
      throw otpError;
    }

    // 4. Send OTP email using Resend
    const emailResponse = await resend.emails.send({
      from: `NUNSA Elections <no-reply@huinunsa.xyz>`, // your domain
      to: email,
      subject: "Your NUNSA Election Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">NUNSA Election Verification</h1>
          <p>Your verification code is:</p>

          <div style="background-color: #f4f4f4; padding: 20px; 
              text-align: center; font-size: 32px; font-weight: bold; 
              letter-spacing: 8px; margin: 20px 0;">
            ${otpCode}
          </div>

          <p>This code expires in 10 minutes. Please do not share it with anyone.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">NUNSA Independent Student Electoral Committee</p>
        </div>
      `,
    });

    console.log("Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
