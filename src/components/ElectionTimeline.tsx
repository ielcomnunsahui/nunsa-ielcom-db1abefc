import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge"; 
import { Calendar, Loader2, AlertCircle, CheckCircle, AlertTriangle, Clock } from "lucide-react"; 

// --- Interfaces ---

interface Stage {
    id: string;
    stage_name: string;
    start_time: string;
    end_time: string;
    created_at: string;
    is_active: boolean; 
}

interface ProcessedStage extends Stage {
    description: string;
    action_link: string;
}

// --- Helper Functions ---

/**
 * Formats an ISO string to the requested format: "Sunday, 16th November, 2025 at 04:14 PM"
 */
const formatDateTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    
    // Function to calculate day suffix (st, nd, rd, th)
    const getDaySuffix = (day: number) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.toLocaleDateString('en-US', { year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
    
    // Combine date and time in the exact requested format
    return `${weekday}, ${day}${getDaySuffix(day)} ${month}, ${year} ${time}`;
};


const getStageStatus = (stage: Stage) => {
    const now = new Date();
    const start = new Date(stage.start_time);
    const end = new Date(stage.end_time);

    if (now >= start && now <= end) return "active";
    if (now < start) return "upcoming";
    return "completed";
};

// Helper function to check if an active stage is ending in the next 24 hours
const isEndingSoon = (stage: Stage): boolean => {
    const status = getStageStatus(stage);
    if (status !== 'active') return false;
    
    const now = new Date().getTime();
    const endTime = new Date(stage.end_time).getTime();
    // 24 hours in milliseconds
    const twentyFourHours = 24 * 60 * 60 * 1000; 

    // Is active AND end time is within the next 24 hours
    return (endTime - now > 0) && (endTime - now <= twentyFourHours);
}


// --- STAGE CARD COMPONENT (for cleaner rendering) ---
interface StageCardProps {
    stage: ProcessedStage;
    index: number;
    totalStages: number;
}

const StageCard: React.FC<StageCardProps> = ({ stage, index, totalStages }) => {
    const status = getStageStatus(stage);
    const isActive = status === "active";
    const isCompleted = status === "completed";
    const isEnding = isEndingSoon(stage);

    // --- Dynamic Styles ---
    let statusColorClass = isEnding ? "text-red-600 dark:text-red-400" : (isActive ? "text-green-600 dark:text-green-400" : (isCompleted ? "text-gray-500 dark:text-gray-400" : "text-primary dark:text-primary/90"));
    let cardClass = isActive ? 'bg-green-50/50 dark:bg-green-900/10 border-green-500 shadow-md transition-shadow duration-300' : 
                    isCompleted ? 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700' : 
                    'bg-card dark:bg-gray-800 border-primary/20 hover:border-primary';
    
    let dotClass = isEnding ? 'bg-red-600 ring-4 ring-red-200' : 
                   (isActive ? 'bg-green-600 ring-4 ring-green-200 dark:ring-green-900' : 
                   (isCompleted ? 'bg-gray-500 ring-1 ring-gray-300 dark:ring-gray-700' : 'bg-primary ring-2 ring-primary/30'));

    // --- Dynamic Button Logic (Updated) ---
    const stageNameLower = stage.stage_name.toLowerCase();
    
    let buttonText = 'Upcoming'; // Default for upcoming
    let buttonVariant = 'outline';
    let buttonClass = '';
    let isButtonDisabled = false;

    if (isCompleted) {
        buttonText = 'Stage Closed';
        isButtonDisabled = true;
        // Specific completed action for Voting/Results
        if (stageNameLower.includes('voting') || stageNameLower.includes('results')) {
            buttonText = 'View Election Results';
            isButtonDisabled = false; // Results should be viewable
        }
    } else if (isActive) {
        buttonVariant = 'default';
        buttonClass = 'bg-green-600 hover:bg-green-700 text-white';

        if (isEnding) {
            buttonClass = 'bg-red-600 hover:bg-red-700 text-white';
        }

        if (stageNameLower.includes('application')) {
            buttonText = 'Apply Now';
        } else if (stageNameLower.includes('voting')) {
            buttonText = 'Cast Your Vote Now';
        } else if (stageNameLower.includes('registration')) {
            buttonText = 'Register to Vote';
        } else if (stageNameLower.includes('manifesto')) {
            // Updated CTA for Manifesto
            buttonText = 'View Candidates & Manifestos';
        } else if (stageNameLower.includes('results')) {
            // Updated CTA for Live Results
             buttonText = 'View Live Results';
        } else {
            // Default CTA for active stages not explicitly covered
            buttonText = 'Proceed to Stage';
        }
    }

    // The vertical line connecting the dots (hidden for the last item)
    const connectorClass = index < totalStages - 1 ? 'absolute top-0 left-[18px] w-0.5 h-full bg-border md:bg-gray-300 dark:bg-gray-700' : 'hidden';

    return (
        <div className="flex relative pb-8 group">

            {/* 1. Timeline Connector & Dot */}
            <div className="absolute top-0 left-0 flex flex-col justify-center items-center h-full w-10">
                {/* Vertical Line */}
                <div className={connectorClass}></div>
                {/* Dot/Marker */}
                <div className={`z-10 w-4 h-4 rounded-full shadow-lg ${dotClass} transition-all duration-500 ease-in-out ${isActive && 'scale-125'}`}></div>
            </div>

            {/* 2. Stage Content Card */}
            <div className={`ml-8 flex-1 p-4 sm:p-6 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 ${cardClass} transform group-hover:translate-y-[-2px]`}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-lg font-bold ${statusColorClass} transition-colors duration-300`}>
                        {stage.stage_name}
                    </h3>
                    
                    {/* Status Badge */}
                    <Badge variant={isEnding ? "destructive" : (isActive ? "default" : "secondary")} className="flex items-center gap-1 text-xs">
                        {isEnding ? <AlertTriangle className="w-3 h-3" /> : (isActive ? <Clock className="w-3 h-3" /> : (isCompleted ? <CheckCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />))}
                        {isEnding ? 'Ending Soon' : (isActive ? 'Active' : (isCompleted ? 'Completed' : 'Upcoming'))}
                    </Badge>
                </div>

                {/* Date Range - uses full format */}
                <div className="text-xs text-muted-foreground mb-3 border-b pb-2 dark:border-gray-700">
                    <p className="font-semibold text-foreground/80">
                        Starts: {formatDateTime(stage.start_time)}
                    </p>
                    <p className="font-semibold text-foreground/80 mt-1">
                        Ends: {formatDateTime(stage.end_time)}
                    </p>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4">
                    {stage.description}
                </p>
                
                {/* Action Button */}
                <Link to={stage.action_link} className="block w-full">
                    <Button 
                        variant={buttonVariant} 
                        size="sm"
                        disabled={isButtonDisabled}
                        className={`w-full text-xs font-semibold ${buttonClass}`}
                    >
                        {buttonText}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// --- ELECTION TIMELINE COMPONENT ---

const ElectionTimeline: React.FC = () => {
    const [stages, setStages] = useState<ProcessedStage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch data from Supabase
    useEffect(() => {
        const fetchStages = async () => {
            try {
                // Ensure correct Supabase table and columns are queried
                const { data, error } = await supabase
                    .from("election_timeline") 
                    .select("id, stage_name, start_time, end_time, created_at, is_active")
                    .order("start_time", { ascending: true });

                if (error) throw error;
                
                // Map the raw data and generate the missing fields (description and action_link)
                const processedData: ProcessedStage[] = (data || []).map((stage: any) => {
                    const status = getStageStatus(stage);
                    const stageNameLower = stage.stage_name.toLowerCase();
                    
                    let defaultLink: string;
                    let defaultDescription: string;

                    // Logic to assign default description and link based on name/status
                    if (stageNameLower.includes('voting')) {
                        defaultLink = '/vote';
                        defaultDescription = 'Cast your vote securely using biometric authentication or OTP verification.';
                    } else if (stageNameLower.includes('registration')) {
                        defaultLink = '/register';
                        defaultDescription = 'Register to vote in the upcoming election.';
                    } else if (stageNameLower.includes('application')) {
                        defaultLink = '/aspirant/apply'; // Changed link for clarity
                        defaultDescription = 'Apply for leadership positions and make a difference in student governance.';
                    } else if (stageNameLower.includes('manifesto')) {
                        defaultLink = '/candidates'; 
                        defaultDescription = 'Watch the candidates present their manifestos and debate live.';
                    } else if (stageNameLower.includes('handing over') || stageNameLower.includes('inauguration')) {
                        defaultLink = '#';
                        defaultDescription = 'The official ceremony where the new executives take their oath of office.';
                    } else if (stageNameLower.includes('results')) {
                        defaultLink = '#';
                        defaultDescription = 'View real-time election results immediately after the voting phase concludes.';
                    } else if (stageNameLower.includes('screening')) {
                        defaultLink = '/candidates';
                        defaultDescription = 'Candidates undergo screening and verification by the electoral committee.';
                    } else {
                        defaultLink = '/support';
                        defaultDescription = 'Details for this stage are coming soon.';
                    }
                    
                    // Finalise description for completed stages
                    if (status === 'completed' && stageNameLower.includes('voting')) {
                        defaultDescription = 'Voting is complete. Click to view the results.';
                        defaultLink = '/results';
                    }
                    else if (status === 'completed') {
                        defaultDescription = 'This stage is successfully completed. Proceeding to the next step.';
                    }

                    return {
                        ...stage,
                        // Add the calculated fields
                        description: defaultDescription,
                        action_link: defaultLink,
                    };
                });
                
                setStages(processedData);

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                console.error("Error fetching stages:", errorMessage);
                setError("Failed to load election timeline. Please check network and table structure.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStages();
    }, []);

    // --- RENDER FUNCTIONS (Loading, Error, Empty) ---
    if (isLoading) {
        return (
            <div className="text-center py-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading election timeline...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20 bg-red-50 border-l-4 border-red-500 p-4 rounded-md mx-auto max-w-lg">
                <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 font-medium">{error}</p>
            </div>
        );
    }

    if (stages.length === 0) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No Network kindly refresh to view timeline</p>
            </div>
        );
    }

    // --- MAIN TIMELINE DISPLAY ---
    return (
        <section className="py-12 sm:py-16 bg-background dark:bg-gray-900 font-sans">
            <div className="container mx-auto px-4 max-w-4xl">
                
 <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4 text-foreground">
                            Key Election Dates & Timeline 📅
                        </h2>
                        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto text-lg">
                            Stay informed on the crucial milestones of the electoral process,
                            Track every milestone of the NUNSA Electoral Process in real-time.
                        </p>
                {/* The Timeline Container: Optimized for Mobile Vertical Flow */}
                <div className="relative pl-0 md:pl-8">
                    
                    {stages.map((stage, index) => (
                        <StageCard 
                            key={stage.id} 
                            stage={stage} 
                            index={index} 
                            totalStages={stages.length}
                        />
                    ))}
                    
                </div>
            </div>
        </section>
    );
};

export default ElectionTimeline;