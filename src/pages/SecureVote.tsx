import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Vote as VoteIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Shield 
} from "lucide-react";
// FIXED: Imported RadioGroup here
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; 
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Define strict types for components
interface Candidate {
  id: string;
  full_name: string;
  position: string;
  picture_url: string | null;
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

interface VoterSession {
  voterId: string;
  email: string;
  authenticatedAt: number;
}

interface VoterInfo {
  id: string;
  email: string;
}

const Vote = () => {
  const [voter, setVoter] = useState<VoterInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selections, setSelections] = useState<VoteSelection>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Helper to calculate progress and check completion
  const totalPositions = positions.length;
  const completedPositionsCount = positions.filter((pos) => 
    selections[pos.name] && selections[pos.name].length > 0
  ).length;

  // Helper to get candidate name for the confirmation dialog
  const getCandidateName = (candidateId: string) => {
    return candidates.find(c => c.id === candidateId)?.full_name || 'No selection';
  };

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const raw = localStorage.getItem("voterSession");
        if (!raw) {
          navigate("/voters-login", { replace: true });
          return;
        }

        let session: VoterSession | null = null;
        try {
          session = JSON.parse(raw);
        } catch {
          session = null;
        }

        if (!session?.voterId || !session?.email) {
          navigate("/voters-login", { replace: true });
          return;
        }

        const { data: voterData, error: voterError } = await supabase
          .from("voters")
          .select("voted, verified")
          .eq("id", session.voterId)
          .maybeSingle();

        if (voterError) throw voterError;

        if (voterData?.voted) {
          toast({
            title: "Vote Already Cast",
            description: "You have already cast your vote. Redirecting to results.",
          });
          navigate("/results", { replace: true });
          return;
        }

        if (!voterData?.verified) {
          toast({
            title: "Not Verified",
            description: "Your account is not verified. Please complete verification.",
            variant: "destructive",
          });
          navigate("/voters-login", { replace: true });
          return;
        }

        setVoter({ id: session.voterId, email: session.email });

        const [positionsResult, candidatesResult] = await Promise.all([
          supabase.from("positions").select("*").order("display_order", { ascending: true }),
          supabase.from("candidates").select("*").order("position", { ascending: true }),
        ]);

        if (positionsResult.error) throw positionsResult.error;
        if (candidatesResult.error) throw candidatesResult.error;

        setPositions(positionsResult.data || []);
        setCandidates(candidatesResult.data || []);

        const initialSelections: VoteSelection = {};
        positionsResult.data?.forEach((pos) => {
          initialSelections[pos.name] = [];
        });
        setSelections(initialSelections);

      } catch (error) {
        console.error("Error loading data:", error);
        const message = error instanceof Error ? error.message : "Failed to load voting data. Please try again.";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        navigate("/voters-login", { replace: true });
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
          description: `You can only select up to ${position.max_selections} candidate(s) for this position.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmitVote = async () => {
    if (!voter) return; 

    if (completedPositionsCount < totalPositions) {
      toast({
        title: "Partial Ballot",
        description: `You have not voted for all positions. You can still submit, but please review.`,
        variant: "default", // Changed from warning to default as warning isn't standard shadcn
      });
    }
    
    if (completedPositionsCount === 0) {
      toast({
        title: "No Votes Selected",
        description: "Please make at least one selection before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("submit-vote", {
        body: { voterId: voter.id, selections },
      });

      if (error) throw error;

      toast({
        title: "Vote Submitted Successfully!",
        description: "Thank you for participating in the election.",
      });

      localStorage.removeItem("voterSession");
      
      setTimeout(() => navigate("/results", { replace: true }), 2000);

    } catch (error) {
      console.error("Vote submission error:", error);
      const message = error instanceof Error ? error.message : "Failed to submit vote. Please try again.";
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 px-4 pb-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading ballot...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />
      
      {/* MAIN CONTENT - Now separated from Dialog logic */}
      <main className="pt-24 px-4 pb-28 sm:pb-12"> 
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full shadow-lg mb-4">
              <VoteIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">
              Cast Your Vote
            </h1>
            <p className="text-lg text-muted-foreground">
              Make your selection for each position
            </p>
            {voter?.email && (
              <p className="text-sm text-muted-foreground mt-2">
                Voting as: <span className="font-semibold">{voter.email}</span>
              </p>
            )}
          </div>

          {/* Positions */}
          <div className="space-y-8">
            {positions.map((position, index) => {
              const positionCandidates = candidates.filter((c) => c.position === position.name);
              const isSelected = (selections[position.name] || []).length > 0;

              return (
                <Card key={position.id} className="p-4 sm:p-6 animate-fade-in border-border shadow-xl" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="mb-6 border-b pb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center">
                      {position.name}
                      {isSelected && <CheckCircle2 className="w-5 h-5 ml-3 text-green-500" />}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {position.vote_type === "single" 
                        ? "Select one candidate" 
                        : `Select up to ${position.max_selections} candidate(s)`}
                    </p>
                  </div>

                  {/* Candidate Selection List */}
                  <div className="grid grid-cols-1 gap-4">
                    {/* BEGIN FIX: Conditionally wrap RadioGroupItems in RadioGroup */}
                    {position.vote_type === "single" ? (
                      <RadioGroup
                        value={selections[position.name]?.[0] || ""}
                        onValueChange={(value) => handleSingleSelection(position.name, value)}
                      >
                        {positionCandidates.map((candidate) => {
                          const isCandidateSelected = selections[position.name]?.includes(candidate.id);
                          return (
                            <div
                              key={candidate.id}
                              className={`flex items-center space-x-4 p-3 sm:p-4 rounded-lg border transition-all cursor-pointer touch-manipulation ${
                                isCandidateSelected
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/50"
                              }`}
                              // Removed onClick here, relies on RadioGroup/Label
                            >
                              <div className="flex items-center h-full">
                                {/* Now a direct child of RadioGroup */}
                                <RadioGroupItem value={candidate.id} id={candidate.id} className="flex-shrink-0" />
                              </div>
                              
                              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border overflow-hidden flex-shrink-0">
                                {candidate.picture_url ? (
                                  <img
                                    src={candidate.picture_url}
                                    alt={candidate.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xl sm:text-2xl font-bold text-muted-foreground">
                                    {candidate.full_name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <Label htmlFor={candidate.id} className="flex-1 cursor-pointer text-base sm:text-lg font-semibold min-w-0">
                                {candidate.full_name}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    ) : (
                      // Multiple selection logic (Checkboxes) remains the same
                      positionCandidates.map((candidate) => {
                        const isCandidateSelected = selections[position.name]?.includes(candidate.id);
                        return (
                          <div
                            key={candidate.id}
                            className={`flex items-center space-x-4 p-3 sm:p-4 rounded-lg border transition-all cursor-pointer touch-manipulation ${
                              isCandidateSelected
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => handleMultipleSelection(position.name, candidate.id, position)}
                          >
                            <div className="flex items-center h-full">
                                <Checkbox
                                    id={candidate.id}
                                    checked={isCandidateSelected}
                                    className="flex-shrink-0"
                                />
                            </div>
                            
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border overflow-hidden flex-shrink-0">
                              {candidate.picture_url ? (
                                <img
                                  src={candidate.picture_url}
                                  alt={candidate.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xl sm:text-2xl font-bold text-muted-foreground">
                                  {candidate.full_name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <Label htmlFor={candidate.id} className="flex-1 cursor-pointer text-base sm:text-lg font-semibold min-w-0">
                              {candidate.full_name}
                            </Label>
                          </div>
                        );
                      })
                    )}
                    {/* END FIX */}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop/Tablet Submission Area (Hidden on Mobile) */}
          <Card className="p-6 mt-8 bg-muted/30 hidden sm:block border-border">
            <div className="flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2 text-foreground">Before You Submit:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Review all your selections carefully</li>
                  <li>• Once submitted, you cannot change your vote</li>
                  <li>• Your vote is completely anonymous</li>
                  <li>• Results will be available immediately after voting closes</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              {/* DIRECT BUTTON with onClick, removed DialogTrigger */}
              <Button
                variant="default"
                size="lg"
                disabled={isSubmitting || completedPositionsCount === 0}
                onClick={() => setShowConfirmation(true)}
                className="px-12 w-full max-w-sm bg-primary hover:bg-primary/90 h-12"
              >
                <VoteIcon className="w-5 h-5 mr-2" />
                Submit My Votes ({completedPositionsCount}/{totalPositions})
              </Button>

              {completedPositionsCount < totalPositions && (
                <p className="text-sm text-muted-foreground mt-4">
                  <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-500"/> You have <span className="font-bold">{totalPositions - completedPositionsCount}</span> position(s) unselected. We recommend voting for all.
                </p>
              )}
            </div>
          </Card>
        </div>
      </main>

      {/* MOBILE FIXED FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 border-t bg-card shadow-[0_-4px_6px_-1px_rgb(0_0_0_/_0.1)] sm:hidden">
          {completedPositionsCount < totalPositions && (
              <Alert className="mb-2 p-2 border-orange-500 text-xs">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mr-2"/>
                  <AlertDescription className="text-muted-foreground">
                      <span className="font-bold">{totalPositions - completedPositionsCount}</span> position(s) remaining.
                  </AlertDescription>
              </Alert>
          )}
          {/* DIRECT BUTTON with onClick, removed DialogTrigger */}
          <Button
              variant="default"
              size="lg"
              disabled={isSubmitting || completedPositionsCount === 0}
              onClick={() => setShowConfirmation(true)}
              className="w-full bg-primary hover:bg-primary/90 h-12"
          >
              {isSubmitting ? (
                  <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                  </>
              ) : (
                  <>
                      <VoteIcon className="w-5 h-5 mr-2" />
                      Submit My Votes ({completedPositionsCount}/{totalPositions})
                  </>
              )}
          </Button>
      </div>
      
      {/* CONFIRMATION DIALOG - Now placed safely at the bottom */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Confirm Your Votes</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className='border-orange-500 bg-orange-50 dark:bg-orange-900/20'>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Final Warning: Once submitted, your votes cannot be changed. Please review your selections carefully.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2"> 
              {positions.map((position) => {
                const selectedIds = selections[position.name] || [];
                const selectedNames = selectedIds.map(getCandidateName);
                
                return (
                  <div 
                    key={position.id} 
                    className="flex flex-col sm:flex-row justify-between items-start py-2 border-b border-border last:border-b-0"
                  >
                    <span className="font-medium text-sm w-full sm:w-1/3 mb-1 sm:mb-0">{position.name}:</span>
                    <span className="text-sm text-foreground/80 font-mono sm:text-right w-full sm:w-2/3">
                      {selectedNames.length > 0 ? selectedNames.join(', ') : <span className="text-destructive font-semibold">No selection</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Review Again
              </Button>
              <Button
                variant="default"
                onClick={handleSubmitVote}
                disabled={isSubmitting || completedPositionsCount === 0}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vote;