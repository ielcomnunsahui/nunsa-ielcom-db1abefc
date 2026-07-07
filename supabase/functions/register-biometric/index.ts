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

    const { voterId, credentialId, publicKey } = await req.json();

    // Store biometric credential
    const { error: biometricError } = await supabaseAdmin
      .from("voter_biometric")
      .insert({
        voter_id: voterId,
        credential_id: credentialId,
        public_key: publicKey,
        counter: 0,
      });

    if (biometricError) {
      console.error("Biometric insert error:", biometricError);
      throw biometricError;
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
      JSON.stringify({ success: true, message: "Biometric registered successfully" }),
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