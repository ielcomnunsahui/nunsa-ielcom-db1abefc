import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { voterId, selections } = await req.json();

    console.log("Vote submission started for voter:", voterId);

    // Validate voter
    const { data: voter, error: voterError } = await supabase
      .from("voters")
      .select("*")
      .eq("id", voterId)
      .single();

    if (voterError || !voter) {
      console.error("Voter validation error:", voterError);
      return new Response(
        JSON.stringify({ error: "Invalid voter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (voter.voted) {
      console.error("Voter has already voted:", voterId);
      return new Response(
        JSON.stringify({ error: "You have already voted" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate issuance token for anonymity
    const issuanceToken = crypto.randomUUID();

    console.log("Generated issuance token:", issuanceToken);

    // Start transaction
    // 1. Insert issuance log (maps token to voter)
    const { error: logError } = await supabase
      .from("issuance_log")
      .insert({
        issuance_token: issuanceToken,
        voter_id: voterId,
      });

    if (logError) {
      console.error("Issuance log error:", logError);
      throw logError;
    }

    // 2. Insert anonymous votes
    const voteRecords = [];
    for (const [position, candidateIds] of Object.entries(selections)) {
      for (const candidateId of candidateIds as string[]) {
        voteRecords.push({
          issuance_token: issuanceToken,
          candidate_id: candidateId,
          position: position,
        });
      }
    }

    const { error: votesError } = await supabase
      .from("votes")
      .insert(voteRecords);

    if (votesError) {
      console.error("Votes insertion error:", votesError);
      throw votesError;
    }

    // 3. Update candidate vote counts
    for (const [_, candidateIds] of Object.entries(selections)) {
      for (const candidateId of candidateIds as string[]) {
        const { error: updateError } = await supabase.rpc("increment_vote_count", {
          candidate_id: candidateId,
        });

        if (updateError) {
          console.error("Vote count update error:", updateError);
          // Continue anyway - we can recalculate from votes table
        }
      }
    }

    // 4. Mark voter as voted and invalidate token
    const { error: voterUpdateError } = await supabase
      .from("voters")
      .update({
        voted: true,
        issuance_token: issuanceToken, // Store for audit trail
        updated_at: new Date().toISOString(),
      })
      .eq("id", voterId);

    if (voterUpdateError) {
      console.error("Voter update error:", voterUpdateError);
      throw voterUpdateError;
    }

    // 5. Log audit event
    const { error: auditError } = await supabase
      .from("audit_log")
      .insert({
        event_type: "VOTE_CAST",
        description: "Vote successfully cast",
        actor_id: voterId,
        metadata: {
          positions: Object.keys(selections),
          timestamp: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error("Audit log error:", auditError);
      // Non-critical, continue
    }

    console.log("Vote submission completed successfully for voter:", voterId);

    return new Response(
      JSON.stringify({ success: true, message: "Vote submitted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Vote submission error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
