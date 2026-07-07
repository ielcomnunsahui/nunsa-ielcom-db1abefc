import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ElectionStage {
  id: string;
  stage_name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface ElectionStatus {
  currentStage: ElectionStage | null;
  votingStage: ElectionStage | null;
  resultsStage: ElectionStage | null;
  isVotingActive: boolean;
  isVotingEnded: boolean;
  isResultsPublished: boolean;
  votingEndTime: Date | null;
  resultsPublishTime: Date | null;
}

export function useElectionTimeline() {
  const [stages, setStages] = useState<ElectionStage[]>([]);
  const [status, setStatus] = useState<ElectionStatus>({
    currentStage: null,
    votingStage: null,
    resultsStage: null,
    isVotingActive: false,
    isVotingEnded: false,
    isResultsPublished: false,
    votingEndTime: null,
    resultsPublishTime: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchElectionTimeline = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('election_timeline')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const electionStages = data || [];
      setStages(electionStages);

      // Calculate election status
      const now = new Date();
      
      // Find voting and results stages
      const votingStage = electionStages.find(stage => 
        stage.stage_name.toLowerCase().includes('voting') || 
        stage.stage_name.toLowerCase().includes('election')
      );
      
      const resultsStage = electionStages.find(stage => 
        stage.stage_name.toLowerCase().includes('result') || 
        stage.stage_name.toLowerCase().includes('announcement')
      );

      // Find current active stage
      const currentStage = electionStages.find(stage => {
        const startTime = new Date(stage.start_time);
        const endTime = new Date(stage.end_time);
        return now >= startTime && now <= endTime && stage.is_active;
      });

      // Determine voting status
      const isVotingActive = votingStage ? 
        now >= new Date(votingStage.start_time) && 
        now <= new Date(votingStage.end_time) && 
        votingStage.is_active : false;

      const isVotingEnded = votingStage ? 
        now > new Date(votingStage.end_time) : false;

      const isResultsPublished = resultsStage ? 
        now >= new Date(resultsStage.start_time) && 
        resultsStage.is_active : false;

      setStatus({
        currentStage,
        votingStage,
        resultsStage,
        isVotingActive,
        isVotingEnded,
        isResultsPublished,
        votingEndTime: votingStage ? new Date(votingStage.end_time) : null,
        resultsPublishTime: resultsStage ? new Date(resultsStage.start_time) : null,
      });

    } catch (error) {
      console.error('Error fetching election timeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to load election timeline.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchElectionTimeline();

    // Set up real-time subscription for timeline changes
    const channel = supabase
      .channel('election-timeline-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'election_timeline' },
        () => {
          fetchElectionTimeline();
        }
      )
      .subscribe();

    // Update status every minute to handle time-based changes
    const interval = setInterval(() => {
      if (stages.length > 0) {
        fetchElectionTimeline();
      }
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchElectionTimeline, stages.length]);

  return {
    stages,
    status,
    isLoading,
    refetch: fetchElectionTimeline,
  };
}