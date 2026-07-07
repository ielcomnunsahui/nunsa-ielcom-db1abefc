import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Loader2, 
  Users, 
  CheckCheck, 
  Shield, 
  RefreshCw, 
  Trophy,
  AlertCircle,
  TrendingUp,
  Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useElectionTimeline } from "@/hooks/useElectionTimeline";

interface Candidate {
  id: string;
  full_name: string;
  position: string;
  picture_url: string | null;
  vote_count: number;
  position_order?: number; // Added to handle display priority
}

interface VotingStats {
  totalVoters: number;
  totalVoted: number;
  turnoutRate: number;
}

export function AdminLiveResults() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votingStats, setVotingStats] = useState<VotingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { status: electionStatus } = useElectionTimeline();

  const fetchData = useCallback(async () => {
    try {
      const { data: cData, error: cError } = await supabase
        .from("candidates")
        .select("id, full_name, position, picture_url, vote_count")
        // Note: Replace "position" with "position_order" if you have a numeric sort column
        .order("position", { ascending: true }) 
        .order("vote_count", { ascending: false });

      if (cError) throw cError;
      setCandidates(cData || []);

      const { data: vData, error: vError } = await supabase
        .from('voters').select('id, voted').eq('verified', true);

      if (vError) throw vError;
      const total = vData?.length || 0;
      const voted = vData?.filter(v => v.voted).length || 0;

      setVotingStats({
        totalVoters: total,
        totalVoted: voted,
        turnoutRate: total > 0 ? (voted / total) * 100 : 0
      });
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel("live-split-table").on("postgres_changes", 
      { event: "*", schema: "public", table: "candidates" }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Logic to Group and Split Positions
  const { leftColPositions, rightColPositions } = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    // 1. Group candidates by position name
    candidates.forEach(c => {
      if (!groups[c.position]) groups[c.position] = [];
      groups[c.position].push(c);
    });

    // 2. Process winners/status for each group
    const processedGroups = Object.entries(groups).map(([posName, members]) => {
      const maxVotes = Math.max(...members.map(m => m.vote_count));
      const totalVotes = members.reduce((sum, m) => sum + m.vote_count, 0);
      
      return {
        posName,
        candidates: members.map(m => {
          const isTop = m.vote_count === maxVotes && m.vote_count > 0;
          const hasDraw = members.filter(comp => comp.vote_count === maxVotes).length > 1;
          let status: "leading" | "winner" | "draw" | "none" = "none";
          if (isTop) {
            if (hasDraw) status = "draw";
            else if (electionStatus.isVotingActive) status = "leading";
            else status = "winner";
          }
          return { ...m, status, percentage: totalVotes > 0 ? (m.vote_count / totalVotes) * 100 : 0 };
        })
      };
    });

    // 3. Split the positions array in half
    const midpoint = Math.ceil(processedGroups.length / 2);
    return {
      leftColPositions: processedGroups.slice(0, midpoint),
      rightColPositions: processedGroups.slice(midpoint)
    };
  }, [candidates, electionStatus.isVotingActive]);

  const RenderTable = ({ data }: { data: any[] }) => (
    <Table className="border-x">
      <TableHeader className="bg-slate-100">
        <TableRow>
          <TableHead className="w-12">Pic</TableHead>
          <TableHead>Candidate</TableHead>
          <TableHead className="text-right">Votes</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((group) => (
          <React.Fragment key={group.posName}>
            {/* Position Heading Row */}
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableCell colSpan={4} className="py-1 px-4 text-[11px] font-black text-white uppercase tracking-widest">
                {group.posName}
              </TableCell>
            </TableRow>
            {/* Candidate Rows */}
            {group.candidates.map((c: any) => (
              <TableRow key={c.id} className="h-12">
                <TableCell className="p-2">
                  <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden border">
                    {c.picture_url && <img src={c.picture_url} alt={c.full_name} className="object-cover h-full w-full" />}
                     
                  </div>
                </TableCell>
                <TableCell className="py-1">
                  <p className="text-sm font-bold leading-none">{c.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.percentage.toFixed(1)}% share</p>
                </TableCell>
                <TableCell className="text-right font-mono font-bold">{c.vote_count}</TableCell>
                <TableCell className="text-center p-1">
                  {c.status === "winner" && <Trophy className="w-4 h-4 text-green-600 mx-auto" />}
                  {c.status === "leading" && <TrendingUp className="w-4 h-4 text-blue-500 animate-pulse mx-auto" />}
                  {c.status === "draw" && <AlertCircle className="w-4 h-4 text-amber-500 mx-auto" />}
                  {c.status === "none" && <Minus className="w-4 h-4 text-slate-200 mx-auto" />}
                </TableCell>
              </TableRow>
            ))}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      {/* Dynamic Header */}
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900">LIVE ELECTION DASHBOARD</h1>
          <div className="flex gap-2">
             <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
               {votingStats?.turnoutRate.toFixed(1)}% Turnout
             </Badge>
             <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
               {votingStats?.totalVoted} Votes Cast
             </Badge>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="shadow-sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Sync Live Results
        </Button>
      </div>

      <Card className="shadow-xl overflow-hidden border-2 border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-x-2 divide-slate-200">
          {/* Left Table Section */}
          <div className="overflow-x-auto">
            <RenderTable data={leftColPositions} />
          </div>

          {/* Right Table Section */}
          <div className="overflow-x-auto">
            <RenderTable data={rightColPositions} />
          </div>
        </div>
      </Card>
      
      <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
        Secure Voting System • Real-time Encryption Enabled • {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}

import React from "react"; // Required for React.Fragment