import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Vote as VoteIcon, Loader2, CheckCircle2, AlertCircle, User } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
//"re_9LDcKg4u_FKG8tqiMa5rvLGNfi8SFAYi3"
interface Candidate {
  id: string;
  full_name: string;
  position: string;
  picture_url: string | null;
  vote_count: number;
}

interface Position {
  id: string;
  name: string;
  vote_type: "single" | "multiple";
  max_selections: number;
  display_order: number;
}

interface VoteSelection {
  [positionName: string]: string[];
}

interface VoterInfo {
  id: string;
  matric: string;
  name: string;
  email?: string;
}

const OLDVote = () => {
  const [voter, setVoter] = useState<VoterInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selections, setSelections] = useState<VoteSelection>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check for voter authentication from different login methods
        const voterMatric = localStorage.getItem("voterMatric");
        const voterId = localStorage.getItem("voterId");
        const userType = localStorage.getItem("userType");

        if (!voterMatric || !voterId || userType !== "voter") {
          toast({
            title: "Authentication Required",
            description: "Please log in to access the voting system.",
            variant: "destructive",
          });
          navigate("/login", { replace: true });
          return;
        }

        // Fetch voter information and check if already voted
        const { data: voterData, error: voterError } = await supabase
          .from("voters")
          .select("id, matric, name, email, voted, verified")
          .eq("id", voterId)
          .single();

        if (voterError) {
          console.error("Voter fetch error:", voterError);
          toast({
            title: "Authentication Error",
            description: "Unable to verify voter identity. Please try logging in again.",
            variant: "destructive",
          });
          navigate("/login", { replace: true });
          return;
        }

        if (!voterData.verified) {
          toast({
            title: "Account Not Verified",
            description: "Your voter account is not verified. Please contact support.",
            variant: "destructive",
          });
          navigate("/login", { replace: true });
          return;
        }

        if (voterData.voted) {
          setHasVoted(true);
          toast({
            title: "Vote Already Cast",
            description: "You have already participated in this election.",
          });
          setTimeout(() => navigate("/results", { replace: true }), 3000);
          return;
        }

        setVoter({
          id: voterData.id,
          matric: voterData.matric,
          name: voterData.name,
          email: voterData.email,
        });

        // Load positions and candidates
        const [positionsResult, candidatesResult] = await Promise.all([
          supabase
            .from("positions")
            .select("*")
            .order("display_order", { ascending: true }),
          supabase
            .from("candidates")
            .select("*")
            .order("position", { ascending: true }),
        ]);

        if (positionsResult.error) throw positionsResult.error;
        if (candidatesResult.error) throw candidatesResult.error;

        setPositions(positionsResult.data || []);
        setCandidates(candidatesResult.data || []);

        // Initialize selections
        const initialSelections: VoteSelection = {};
        positionsResult.data?.forEach((pos) => {
          initialSelections[pos.name] = [];
        });
        setSelections(initialSelections);

      } catch (error) {
        console.error("Error loading voting data:", error);
        toast({
          title: "Loading Error",
          description: "Failed to load voting data. Please refresh and try again.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [navigate, toast]);

  const handleSingleSelection = (positionName: string, candidateId: string) => {
    setSelections({
      ...selections,
      [positionName]: [candidateId],
    });
  };

  const handleMultipleSelection = (positionName: string, candidateId: string, position: Position) => {
    const current = selections[positionName] || [];
    const isSelected = current.includes(candidateId);

    if (isSelected) {
      setSelections({
        ...selections,
        [positionName]: current.filter((id) => id !== candidateId),
      });
    } else {
      if (current.length < position.max_selections) {
        setSelections({
          ...selections,
          [positionName]: [...current, candidateId],
        });
      } else {
        toast({
          title: "Selection Limit Reached",
          description: `You can only select up to ${position.max_selections} candidate(s) for ${position.name}.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmitVote = async () => {
    if (!voter) return;

    // Validate all positions have selections
    const allPositionsFilled = positions.every((pos) => 
      selections[pos.name] && selections[pos.name].length > 0
    );

    if (!allPositionsFilled) {
      toast({
        title: "Incomplete Ballot",
        description: "Please make a selection for all positions before submitting your vote.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit vote through edge function
      const { error } = await supabase.functions.invoke("submit-vote", {
        body: { 
          voterId: voter.id, 
          selections,
          voterMatric: voter.matric 
        },
      });

      if (error) throw error;

      // Mark as voted in local storage to prevent re-access
      localStorage.setItem("hasVoted", "true");

      toast({
        title: "Vote Submitted Successfully!",
        description: "Thank you for participating in the NUNSA election.",
      });

      // Clear voter session and redirect
      setTimeout(() => {
        localStorage.removeItem("voterMatric");
        localStorage.removeItem("voterId");
        localStorage.removeItem("userType");
        navigate("/results", { replace: true });
      }, 2000);

    } catch (error) {
      console.error("Vote submission error:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 sm:pt-24 px-2 sm:px-4 pb-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your ballot...</p>
          </div>
        </main>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 sm:pt-24 px-2 sm:px-4 pb-12 flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 text-center max-w-md mx-auto">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Vote Already Cast</h2>
            <p className="text-muted-foreground mb-4">
              You have already participated in this election. Thank you for voting!
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to results page...
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 sm:pt-24 px-2 sm:px-4 pb-12">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-6 sm:mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-gradient-success rounded-full shadow-success-glow mb-4">
              <VoteIcon className="w-6 h-6 sm:w-8 sm:h-8 text-success-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-foreground">
              Cast Your Vote
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Make your selection for each position
            </p>
            {voter && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Voter:</strong> {voter.name} ({voter.matric})
                </p>
                {voter.email && (
                  <p className="text-xs text-muted-foreground">
                    {voter.email}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6 sm:space-y-8">
            {positions.map((position, index) => {
              const positionCandidates = candidates.filter((c) => c.position === position.name);

              return (
                <Card key={position.id} className="p-4 sm:p-6 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{position.name}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {position.vote_type === "single" 
                        ? "Select one candidate" 
                        : `Select up to ${position.max_selections} candidate(s)`}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {selections[position.name]?.length > 0 && (
                        <span className="text-primary font-medium">
                          {selections[position.name].length} selected
                          {position.vote_type === "multiple" && ` of ${position.max_selections} maximum`}
                        </span>
                      )}
                    </div>
                  </div>

                  {positionCandidates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No candidates available for this position</p>
                    </div>
                  ) : (
                    <>
                      {position.vote_type === "single" ? (
                        <RadioGroup
                          value={selections[position.name]?.[0] || ""}
                          onValueChange={(value) => handleSingleSelection(position.name, value)}
                        >
                          <div className="space-y-3 sm:space-y-4">
                            {positionCandidates.map((candidate) => (
                              <div
                                key={candidate.id}
                                className={`flex items-center space-x-3 sm:space-x-4 p-4 sm:p-5 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                                  selections[position.name]?.includes(candidate.id)
                                    ? "border-primary bg-primary/5 shadow-md"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => handleSingleSelection(position.name, candidate.id)}
                              >
                                <RadioGroupItem value={candidate.id} id={candidate.id} />
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border overflow-hidden flex-shrink-0">
                                  {candidate.picture_url ? (
                                    <img
                                      src={candidate.picture_url}
                                      alt={candidate.full_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`flex items-center justify-center w-full h-full ${candidate.picture_url ? 'hidden' : ''}`}>
                                    <span className="text-xl sm:text-3xl font-bold text-muted-foreground">
                                      {candidate.full_name.charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <Label htmlFor={candidate.id} className="cursor-pointer text-base sm:text-lg font-semibold block">
                                    {candidate.full_name}
                                  </Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Candidate for {candidate.position}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {positionCandidates.map((candidate) => (
                            <div
                              key={candidate.id}
                              className={`flex items-center space-x-3 sm:space-x-4 p-4 sm:p-5 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                                selections[position.name]?.includes(candidate.id)
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => handleMultipleSelection(position.name, candidate.id, position)}
                            >
                              <Checkbox
                                id={candidate.id}
                                checked={selections[position.name]?.includes(candidate.id)}
                                onCheckedChange={() => handleMultipleSelection(position.name, candidate.id, position)}
                              />
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border overflow-hidden flex-shrink-0">
                                {candidate.picture_url ? (
                                  <img
                                    src={candidate.picture_url}
                                    alt={candidate.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`flex items-center justify-center w-full h-full ${candidate.picture_url ? 'hidden' : ''}`}>
                                  <span className="text-xl sm:text-3xl font-bold text-muted-foreground">
                                    {candidate.full_name.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <Label htmlFor={candidate.id} className="cursor-pointer text-base sm:text-lg font-semibold block">
                                  {candidate.full_name}
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Candidate for {candidate.position}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              );
            })}
          </div>

          <Card className="p-4 sm:p-6 mt-6 sm:mt-8 bg-muted/30">
            <div className="flex items-start gap-3 mb-4 sm:mb-6">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2 text-foreground text-sm sm:text-base">Before You Submit:</h3>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <li>• Review all your selections carefully</li>
                  <li>• Once submitted, you cannot change your vote</li>
                  <li>• Your vote is completely anonymous and secure</li>
                  <li>• Results will be available after the voting period ends</li>
                </ul>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-sm mb-2">Your Selections Summary:</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                {positions.map((position) => (
                  <div key={position.id} className="flex justify-between">
                    <span>{position.name}:</span>
                    <span className={selections[position.name]?.length > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
                      {selections[position.name]?.length > 0 
                        ? `${selections[position.name].length} selected`
                        : "No selection"
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmitVote}
              disabled={isSubmitting || positions.some(pos => !selections[pos.name] || selections[pos.name].length === 0)}
              className="w-full bg-gradient-success hover:shadow-success-glow text-base sm:text-lg py-4 sm:py-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Submitting Vote...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Submit My Vote
                </>
              )}
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OLDVote;