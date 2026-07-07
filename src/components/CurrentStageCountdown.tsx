import { useEffect, useState, useCallback } from "react";
import { Clock, CheckCircle, ArrowRight, CalendarCheck, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button"; // Assuming your ShadCN/Radix UI Button component
import { supabase } from "@/integrations/supabase/client"; // Added to enable data fetching logic

// --- 1. Interfaces ---
interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

interface CountdownTimerProps {
    targetDate: Date;
    stageName: string;
    stageColor: string; // Expected to be a BG class (e.g., 'bg-blue-600')
    linkToId?: string;
    linkText?: string;
    linkVariant?: "default" | "success" | "outline";
}

interface TimelineStage {
    id: string;
    stage_name: string;
    end_time: string; // Crucial for the countdown
    color_class?: string;
    link_id?: string;
    link_text?: string;
}

// --- 2. Helper Component: Individual Time Block (Used by CountdownTimer) ---
const TimeBlock: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center justify-center p-2 bg-white/10 rounded-lg shadow-inner backdrop-blur-sm transition-all duration-300">
        <div className="text-3xl sm:text-4xl font-extrabold leading-none tabular-nums">
            {String(value).padStart(2, "0")}
        </div>
        <div className="text-xs sm:text-sm opacity-90 mt-1 uppercase font-semibold tracking-wider">
            {label}
        </div>
    </div>
);

// --- 3. Core Component: Countdown Timer (Handles pure UI/timer logic) ---
const CountdownTimer = ({
    targetDate,
    stageName,
    stageColor,
    linkToId,
    linkText,
    linkVariant = "default",
}: CountdownTimerProps) => {

    const calculateTimeLeft = useCallback((): TimeLeft => {
        const difference = +targetDate - +new Date();
        if (difference > 0) {
            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }, [targetDate]);

    const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

    useEffect(() => {
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    const isTimeUp =
        timeLeft.days === 0 &&
        timeLeft.hours === 0 &&
        timeLeft.minutes === 0 &&
        timeLeft.seconds === 0;

    const finalColorClass = stageColor.startsWith("bg-") ? stageColor : "bg-blue-600";
    const StatusIcon = isTimeUp ? CheckCircle : Clock;

    const handleLinkClick = () => {
        if (linkToId) {
            document.getElementById(linkToId)?.scrollIntoView({ behavior: "smooth" });
        }
    };

    let buttonStyle = "shadow-lg gap-2 w-full sm:w-auto h-10 text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02]";

    if (isTimeUp) {
        buttonStyle += " bg-white text-green-600 hover:bg-gray-100";
    } else if (linkVariant === "success") {
        buttonStyle += " bg-white text-green-600 hover:bg-gray-100";
    } else if (linkVariant === "outline") {
        buttonStyle += " border border-white text-white hover:bg-white hover:text-gray-800";
    } else {
        buttonStyle += " bg-white text-primary hover:bg-gray-100";
    }

    return (
        <div className="w-full max-w-5xl mx-auto animate-fade-in px-2" role="timer">
            <div
                className={`${
                    isTimeUp ? "bg-green-700 shadow-xl shadow-green-500/50" : finalColorClass
                } text-white rounded-xl sm:rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl transition-all duration-500`}
            >
                {/* Background Overlay for Depth */}
                <div className="absolute inset-0 bg-black/20 z-0" />

                <div className="relative z-10 space-y-6">
                    {/* Top Section: Stage Name & Countdown/Action */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6">

                        {/* Current Stage Display (Left Side) */}
                        <div className="flex items-center space-x-4 w-full sm:w-auto justify-center sm:justify-start flex-shrink-0">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                                <StatusIcon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-sm font-light opacity-90">
                                    {isTimeUp ? "Stage Status" : "Active Timeline Stage"}
                                </p>
                                <h2 className="text-xl sm:text-2xl font-bold mt-0.5">
                                    {stageName}
                                </h2>
                            </div>
                        </div>

                        {/* Countdown or Action Display (Right Side) */}
                        <div className="w-full sm:w-auto text-center sm:text-right" aria-live="polite">
                            {isTimeUp ? (
                                // *** Content when time is up ***
                                <div className="flex flex-col items-center sm:items-end w-full space-y-3">
                                    <p className="text-xl font-bold">Stage Finished!</p>
                                    {linkToId && linkText && (
                                        <Button
                                            onClick={handleLinkClick}
                                            className={buttonStyle}
                                        >
                                            {linkText}
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                // *** Mobile-Optimized Countdown Display ***
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center sm:justify-end space-x-2">
                                        <Clock className="h-4 w-4" aria-hidden="true" />
                                        <span className="font-semibold text-sm sm:text-base tracking-wider uppercase">
                                            Time Remaining
                                        </span>
                                    </div>

                                    {timeLeft && (
                                        <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto sm:mx-0">
                                            <TimeBlock value={timeLeft.days} label="Days" />
                                            <TimeBlock value={timeLeft.hours} label="Hours" />
                                            <TimeBlock value={timeLeft.minutes} label="Mins" />
                                            <TimeBlock value={timeLeft.seconds} label="Secs" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Bar at the bottom (Date Display) */}
                    <div className="flex items-center justify-center sm:justify-start space-x-2 border-t border-white/30 pt-4 mt-4">
                        <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                        <span className="font-medium text-xs sm:text-sm text-center sm:text-left opacity-90">
                            {isTimeUp
                                ? "Stage duration officially complete"
                                : `Ends: ${targetDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`}
                        </span>
                    </div>
                </div>

                {/* Decorative background circles (Styling remains for visual interest) */}
                <div className="absolute top-0 right-0 w-48 h-48 opacity-10 z-0">
                    <div className="w-full h-full bg-white rounded-full translate-y-[-20%] translate-x-[20%]" />
                </div>
                <div className="absolute bottom-0 left-0 w-24 h-24 opacity-10 z-0">
                    <div className="w-full h-full bg-white rounded-full translate-y-[20%] translate-x-[-20%]" />
                </div>
            </div>
        </div>
    );
};


// --- 4. Wrapper Component: Current Stage Countdown (Handles data fetching) ---
export function CurrentStageCountdown() {
    const [currentStage, setCurrentStage] = useState<TimelineStage | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCurrentStage = useCallback(async () => {
        try {
            const now = new Date().toISOString();
            
            const { data, error } = await supabase
                .from("election_timeline")
                .select("*")
                .eq("is_active", true) 
                .lte("start_time", now)
                .gte("end_time", now)
                .order("start_time", { ascending: true }) // If multiple stages are active, pick the earliest start
                .limit(1);

            if (error) throw error;

            setCurrentStage(data && data.length > 0 ? data[0] : null);
        } catch (error) {
            console.error("Error fetching current stage:", error);
            // Optionally set currentStage to a fallback state or keep it null
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentStage();

        // Optional: Real-time listener for updates (as seen in your snippet)
        const channel = supabase
            .channel('election_timeline_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'election_timeline' }, (payload) => {
                // Re-fetch data on any change
                fetchCurrentStage();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchCurrentStage]);

    // --- Conditional Rendering ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!currentStage) {
        return (
            <div className="text-center py-12 bg-gray-100 rounded-xl shadow-inner border border-gray-200">
                <AlertCircle className="w-10 h-10 text-yellow-600 mx-auto mb-4" />
                <p className="text-base text-gray-700 font-semibold">No Active Election Stage Right Now</p>
                <p className="text-sm text-muted-foreground">Check the full timeline for upcoming events.</p>
            </div>
        );
    }

    // --- Render the Countdown Component ---
    return (
        <CountdownTimer 
            targetDate={new Date(currentStage.end_time)}
            stageName={currentStage.stage_name}
            stageColor={currentStage.color_class || 'bg-blue-600'}
            linkToId={currentStage.link_id}
            linkText={currentStage.link_text}
            // Add linkVariant if you pass it from the DB
        />
    );
}

// export default CountdownTimer; // If you need to export only the timer, but we are using the wrapper
// Export only the wrapper component, as requested
export { CountdownTimer }; // You can optionally export the core timer as well