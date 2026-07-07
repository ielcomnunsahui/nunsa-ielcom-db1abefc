// src/hooks/use-active-stage.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
    UserPlus, Trophy, Vote, TrendingUp, HelpCircle 
} from "lucide-react"; 
import { LucideIcon } from "lucide-react";

// Define the shape of the CTA object returned by the hook
interface ActiveStageCTA {
    text: string;
    icon: LucideIcon;
    // The internal route for the stage, used for post-login redirection
    href: string; 
}

// Minimal Stage structure (based on Index.tsx and database schema)
interface Stage {
    id: string;
    stage_name: string;
    start_time: string;
    end_time: string;
    is_active: boolean; 
}

/**
 * Maps the raw stage name from the database to a structured CTA object.
 * @param stage The active Stage object.
 * @returns ActiveStageCTA object or null if no CTA is relevant.
 */
const getStageCtaProps = (stage: Stage): ActiveStageCTA | null => {
    // Ensure case-insensitivity
    const stageName = stage.stage_name.toLowerCase();
    
    switch (stageName) {
        case 'registration period':
            return {
                text: 'Register to Vote',
                icon: UserPlus,
                href: '/register',
            };
        case 'application period':
            return {
                text: 'Aspirant Application',
                icon: Trophy,
                href: '/aspirant',
            };
        case 'voting period':
            return {
                text: 'Proceed to Vote',
                icon: Vote,
                href: '/voters-login', // Directs users to the login screen before voting
            };
        case 'results published':
            return {
                text: 'View Election Results',
                icon: TrendingUp,
                href: '/results',
            };
        case 'screening period': // Add screening as a known stage, if it needs a CTA
            return {
                text: 'View Candidates',
                icon: Trophy,
                href: '/candidates', 
            };
        default:
            return null;
    }
}

/**
 * Hook to fetch the currently active electoral stage CTA.
 * @returns An object containing the CTA props and loading state.
 */
export const useActiveStage = () => {
    const [activeStageCta, setActiveStageCta] = useState<ActiveStageCTA | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchActiveStage = async () => {
            setIsLoading(true);
            try {
                // Fetch active stages (assuming 'election_stages' table)
                // We order by start_time to prioritize the earliest/current stage if multiple are somehow active
                const { data: stagesData } = await supabase
                    .from("election_timeline")
                    .select("*")
                    .eq("is_active", true)
                    .order("start_time", { ascending: true });

                if (stagesData && stagesData.length > 0) {
                    // Use the first active stage as the primary promotion
                    const primaryStage = stagesData[0] as Stage; 
                    const ctaProps = getStageCtaProps(primaryStage);
                    setActiveStageCta(ctaProps);
                } else {
                    setActiveStageCta(null);
                }
            } catch (err) {
                // In case of error, treat as no active stage
                console.error("Error fetching active stage:", err);
                setActiveStageCta(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchActiveStage();
    }, []);

    return { activeStageCta, isLoading };
}