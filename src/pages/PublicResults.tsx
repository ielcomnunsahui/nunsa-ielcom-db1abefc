import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Loader2, 
  Users, 
  CheckCheck, 
  Shield, 
  AlertTriangle, 
  ScrollText, 
  Clock,
  Calendar,
  TrendingUp,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useElectionTimeline } from "@/hooks/useElectionTimeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Candidate {
  id: string;
  full_name: string;
  position: string;
  picture_url: string | null;
  vote_count: number;
  manifesto: string | null;
}

interface PositionResults {
  position: string;
  candidates: Candidate[];
  totalVotes: number;
  winner: Candidate | null;
  hasWinner: boolean;
  isDraw: boolean;
}

const CountdownTimer = ({ endTime }: { endTime: Date }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const difference = endTime.getTime() - now;
      setTimeRemaining(Math.max(0, difference));
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  if (timeRemaining <= 0) {
    return (
      <div className="flex items-center justify-center p-4 bg-green-100 border-l-4 border-green-600 rounded-lg text-green-800 font-semibold">
        <Shield className="w-5 h-5 mr-2" />
        VOTING PERIOD CONCLUDED
      </div>
    );
  }

  const TimeSegment = ({ value, label }: { value: number, label: string }) => (
    <div className="text-center p-3 bg-primary/10 rounded-lg min-w-[60px]">
      <div className="text-2xl font-bold text-primary">{value.toString().padStart(2, '0')}</div>
      <div className="text-xs font-medium text-muted-foreground uppercase">{label}</div>
    </div>
  );

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg border-t-4 border-red-600">
      <div className="flex items-center justify-center mb-4">
        <Clock className="w-5 h-5 text-red-600 mr-2 animate-pulse" />
        <h3 className="text-lg font-bold text-red-600 uppercase tracking-wider">VOTING ENDS IN</h3>
      </div>
      <div className="flex justify-center gap-3">
        {days > 0 && <TimeSegment value={days} label="Days" />}
        <TimeSegment value={hours} label="Hrs" />
        <TimeSegment value={minutes} label="Mins" />
        <TimeSegment value={seconds} label="Secs" />
      </div>
    </div>
  );
};

const ResultsNotAvailable = ({ electionStatus }: { electionStatus: any }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-24 px-4 pb-16">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-primary rounded-full shadow-lg mb-4">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
              Election Results
            </h1>
            <p className="text-lg text-muted-foreground">
              NUNSA IELCOM 2025/2026 Academic Session
            </p>
          </div>

          {electionStatus.isVotingActive && electionStatus.votingEndTime && (
            <div className="mb-8">
              <CountdownTimer endTime={electionStatus.votingEndTime} />
            </div>
          )}

          <Card className="p-8 text-center shadow-lg">
            <div className="mb-6">
              {electionStatus.isVotingActive ? (
                <Clock className="w-16 h-16 text-blue-500 mx-auto animate-pulse" />
              ) : electionStatus.isVotingEnded && !electionStatus.isResultsPublished ? (
                <Shield className="w-16 h-16 text-orange-500 mx-auto" />
              ) : (
                <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto" />
              )}
            </div>

            <h2 className="text-2xl font-bold mb-4 text-foreground">
              {electionStatus.isVotingActive 
                ? "Voting in Progress" 
                : electionStatus.isVotingEnded && !electionStatus.isResultsPublished
                ? "Results Under Review"
                : "Results Not Available"
              }
            </h2>

            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {electionStatus.isVotingActive 
                ? "The election is currently ongoing. Results will be published after voting concludes and votes are tallied."
                : electionStatus.isVotingEnded && !electionStatus.isResultsPublished
                ? "Voting has concluded. Results are being verified and will be published shortly."
                : "Election results are not yet available. Please check back later or contact the electoral commission."
              }
            </p>

            {electionStatus.resultsPublishTime && (
              <Alert className="max-w-md mx-auto">
                <Calendar className="h-4 w-4" />
                <AlertTitle>Expected Publication</AlertTitle>
                <AlertDescription>
                  Results are expected to be published on{' '}
                  {electionStatus.resultsPublishTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </AlertDescription>
              </Alert>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default function PublicResults() {
  const [results, setResults] = useState<PositionResults[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { status: electionStatus, isLoading: timelineLoading } = useElectionTimeline();
  const { toast } = useToast();

  const fetchResults = useCallback(async () => {
    try {
      const { data: candidates, error } = await supabase
        .from("candidates")
        .select("id, full_name, position, picture_url, vote_count, manifesto")
        .order("position", { ascending: true })
        .order("vote_count", { ascending: false });

      if (error) throw error;

      // Group and aggregate data
      const grouped = (candidates || []).reduce((acc, candidate) => {
        const existing = acc.find((p) => p.position === candidate.position);
        if (existing) {
          existing.candidates.push(candidate);
          existing.totalVotes += candidate.vote_count || 0;
        } else {
          acc.push({
            position: candidate.position,
            candidates: [candidate],
            totalVotes: candidate.vote_count || 0,
            winner: null,
            hasWinner: false,
            isDraw: false,
          });
        }
        return acc;
      }, [] as PositionResults[]);

      // Determine winner/draw status (only for finalized results)
      const finalResults = grouped.map(p => {
        const leader = p.candidates[0];
        const second = p.candidates[1];

        const isDraw = p.candidates.length > 1 && 
                      leader?.vote_count > 0 && 
                      leader.vote_count === second?.vote_count;
        
        const hasWinner = electionStatus.isVotingEnded && 
                         electionStatus.isResultsPublished &&
                         leader && 
                         leader.vote_count > 0 && 
                         !isDraw;

        return {
          ...p,
          winner: hasWinner ? leader : null,
          hasWinner,
          isDraw,
        };
      });
      
      setResults(finalResults);
      
    } catch (error) {
      console.error("Error fetching results:", error);
      toast({
        title: "Error",
        description: "Failed to fetch election results.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, electionStatus.isVotingEnded, electionStatus.isResultsPublished]);

  useEffect(() => {
    if (!timelineLoading) {
      fetchResults();
    }
  }, [fetchResults, timelineLoading]);

  // Show loading state
  if (isLoading || timelineLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-24 px-4 pb-12">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground">Loading Results...</h2>
              <p className="text-muted-foreground mt-2">Please wait while we fetch the latest data.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show results not available if voting is active or results not published
  if (!electionStatus.isResultsPublished) {
    return <ResultsNotAvailable electionStatus={electionStatus} />;
  }

  // Calculate overall statistics
  const totalPositions = results.length;
  const totalCandidates = results.reduce((acc, p) => acc + p.candidates.length, 0);
  const grandTotalVotes = results.reduce((acc, p) => acc + p.totalVotes, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-24 px-4 pb-16">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12 p-6 rounded-xl bg-card shadow-xl border-t-8 border-primary">
            <div className="inline-flex items-center justify-center p-4 bg-primary rounded-full shadow-lg mb-4">
              <Award className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-2 uppercase tracking-wide text-foreground">
              Official Election Results
            </h1>
            <p className="text-lg md:text-xl font-semibold text-green-600">
              NUNSA IELCOM 2025/2026 Academic Session
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Published on {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 shadow-lg border-l-4 border-indigo-500">
              <div className="flex items-center justify-between mb-2">
                <ScrollText className="w-8 h-8 text-indigo-500" />
                <span className="text-sm font-bold text-muted-foreground uppercase">Positions</span>
              </div>
              <p className="text-3xl font-black text-foreground">{totalPositions}</p>
            </Card>
            
            <Card className="p-6 shadow-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-500" />
                <span className="text-sm font-bold text-muted-foreground uppercase">Candidates</span>
              </div>
              <p className="text-3xl font-black text-foreground">{totalCandidates}</p>
            </Card>
            
            <Card className="p-6 shadow-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-8 h-8 text-green-500" />
                <span className="text-sm font-bold text-muted-foreground uppercase">Total Votes</span>
              </div>
              <p className="text-3xl font-black text-foreground">{grandTotalVotes.toLocaleString()}</p>
            </Card>
          </div>

          {/* Results by Position */}
          <h2 className="text-2xl font-bold text-foreground mb-6 border-b pb-2">
            Election Results by Position
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {results.map((positionResult) => (
              <Card key={positionResult.position} className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ScrollText className="w-5 h-5 text-primary" />
                      {positionResult.position}
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {positionResult.totalVotes} votes cast
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {positionResult.candidates.map((candidate, idx) => {
                    const percentage = positionResult.totalVotes > 0 
                      ? (candidate.vote_count / positionResult.totalVotes) * 100 
                      : 0;
                    
                    const isWinner = positionResult.hasWinner && idx === 0;
                    const isDraw = positionResult.isDraw && idx === 0;

                    return (
                      <div
                        key={candidate.id}
                        className={`p-4 rounded-xl border-l-4 ${
                          isWinner 
                            ? 'border-green-600 bg-green-50 shadow-md' 
                            : isDraw
                            ? 'border-orange-500 bg-orange-50 shadow-md'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {candidate.picture_url && (
                              <img
                                src={candidate.picture_url}
                                alt={candidate.full_name}
                                className={`w-12 h-12 rounded-full object-cover border-2 ${
                                  isWinner ? 'border-green-600' : 'border-gray-300'
                                }`}
                              />
                            )}
                            <div>
                              <h4 className={`font-bold text-lg ${
                                isWinner ? 'text-green-800' : 'text-foreground'
                              }`}>
                                {candidate.full_name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {percentage.toFixed(2)}% of votes
                              </p>
                            </div>
                          </div>
                          
                          {isWinner && (
                            <Badge className="bg-green-600 hover:bg-green-600 text-white">
                              <CheckCheck className="w-3 h-3 mr-1" />
                              ELECTED
                            </Badge>
                          )}
                          
                          {isDraw && (
                            <Badge className="bg-orange-500 hover:bg-orange-500 text-white">
                              TIE
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              Vote Count
                            </span>
                            <span className={`text-xl font-bold ${
                              isWinner ? 'text-green-800' : 'text-foreground'
                            }`}>
                              {candidate.vote_count.toLocaleString()}
                            </span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className={`h-3 ${
                              isWinner ? '[&>div]:bg-green-600' : '[&>div]:bg-primary'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="mt-6 pt-4 border-t border-border text-center bg-muted/30 p-3 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">
                      Total Valid Votes: 
                    </span>
                    <span className="text-lg font-bold text-primary ml-2">
                      {positionResult.totalVotes.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {results.length === 0 && (
            <Card className="p-12 text-center shadow-lg">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Results Available</h3>
              <p className="text-gray-500">
                No election results are currently available for display.
              </p>
            </Card>
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-muted-foreground border-t pt-8">
            <p>
              These are the official results of the NUNSA IELCOM election for the 2025/2026 academic session.
            </p>
            <p className="mt-1">
              For any inquiries or disputes, please contact the Electoral Commission.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}