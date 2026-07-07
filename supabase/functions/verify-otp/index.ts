
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { voterId, otpCode } = await req.json();

    // Verify OTP
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from("voter_otp")
      .select("*")
      .eq("voter_id", voterId)
      .eq("otp_code", otpCode)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (otpError) {
      console.error("OTP query error:", otpError);
      throw otpError;
    }

    if (!otpData) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabaseAdmin
      .from("voter_otp")
      .update({ verified: true })
      .eq("id", otpData.id);

    if (updateError) {
      console.error("OTP update error:", updateError);
      throw updateError;
    }

    // Mark voter as verified
    const { error: voterError } = await supabaseAdmin
      .from("voters")
      .update({ verified: true })
      .eq("id", voterId);

    if (voterError) {
      console.error("Voter update error:", voterError);
      throw voterError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP verified successfully" }),
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