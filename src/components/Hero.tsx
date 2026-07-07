import { useEffect, useState } from "react"; 
import { supabase } from "@/integrations/supabase/client"; 
import { Button } from "@/components/ui/button";
import { Lock, Trophy, TrendingUp, Users, CheckCircle, UserPlus, FileText, Loader2, Vote, Shield } from "lucide-react"; 
import { Link } from "react-router-dom";
import heroBackground from "@/assets/herobg.jpg"; 
import { CurrentStageCountdown } from "@/components/CurrentStageCountdown"; 
import { Badge } from "@/components/ui/badge"; // Ensure this path is correct if not already in global components


// --- 1. Type Definition ---
interface Stage {
    id: string;
    stage_name: string;
    start_time: string;
    end_time: string;
    created_at: string;
    is_active: boolean; 
}

// --- 3. Main Component (Restructured and Enhanced) ---
const Hero = () => {
    // State to hold ALL currently active stages
    const [activeStages, setActiveStages] = useState<Stage[]>([]); 
    const [isLoadingStage, setIsLoadingStage] = useState(true);

    // Fetch All Stages and Filter by Current Time
    useEffect(() => {
        const fetchAndFilterActiveStages = async () => {
            setIsLoadingStage(true);
            const now = new Date(); 

            try {
                // Fetch ALL stages, ordered by start time
                const { data: allStages, error } = await supabase
                    .from("election_timeline")
                    .select("*")
                    .order("start_time", { ascending: true }); 

                if (error) throw error;
                
                // Filter stages that are currently active based on start_time and end_time
                const currentlyActiveStages = (allStages as Stage[]).filter(stage => {
                    const startTime = new Date(stage.start_time);
                    const endTime = new Date(stage.end_time);
                    return now >= startTime && now < endTime; 
                });

                setActiveStages(currentlyActiveStages);

            } catch (err) {
                console.error("Unexpected error fetching election stages:", err);
                setActiveStages([]); 
            } finally {
                setIsLoadingStage(false);
            }
        };

        fetchAndFilterActiveStages();
    }, []); 

    // Dynamic CTA Rendering Logic
    const renderCTAs = () => {
        if (isLoadingStage) {
            return (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
            );
        }

        const uniqueCTAs: { [key: string]: React.ReactElement } = {};

        activeStages.forEach(stage => {
            const stageName = stage.stage_name.toLowerCase();
            
            let ctaKey = ''; 
            let ctaElement: React.ReactElement | null = null;
            
            // Primary CTAs (Color coded for quick recognition)
            switch (stageName) {
                case 'registration period':
                    ctaKey = 'register';
                    ctaElement = (
                        <Button 
                            key={ctaKey}
                            asChild 
                            size="lg" 
                            className="bg-green-500 hover:bg-green-600 text-white shadow-xl text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                        >
                            <Link to="/register">
                                <UserPlus className="w-5 h-5 mr-2" /> Register to Participate
                            </Link>
                        </Button>
                    );
                    break;

                case 'application period':
                    ctaKey = 'apply';
                    ctaElement = (
                        <Button 
                            key={ctaKey}
                            asChild 
                            size="lg" 
                            className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-xl text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                        >
                            <Link to="/aspirant">
                                <Trophy className="w-5 h-5 mr-2" /> Apply for Position
                            </Link>
                        </Button>
                    );
                    break;

                case 'voting period':
                    ctaKey = 'vote';
                    ctaElement = (
                        <Button 
                            key={ctaKey}
                            asChild 
                            size="lg" 
                            className="bg-red-600 hover:bg-red-700 text-white shadow-xl text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                        >
                            <Link to="/vote">
                                <Vote className="w-5 h-5 mr-2" /> Cast Your Vote Now
                            </Link>
                        </Button>
                    );
                    break;

                case 'results publication':
                    ctaKey = 'results';
                    ctaElement = (
                        <Button 
                            key={ctaKey}
                            asChild 
                            size="lg" 
                            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 shadow-xl text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                        >
                            <Link to="/results">
                                <TrendingUp className="w-5 h-5 mr-2" /> View Election Results
                            </Link>
                        </Button>
                    );
                    break;
            }

            if (ctaElement) {
                uniqueCTAs[ctaKey] = ctaElement;
            }
        });

        // Always include 'View Candidates' as a general secondary option
        uniqueCTAs['candidates'] = (
            <Button 
                key="candidates"
                asChild 
                size="lg" 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border border-white/50 shadow-lg text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
            >
                <Link to="/candidates">
                    <Users className="w-5 h-5 mr-2" /> View Candidates
                </Link>
            </Button>
        );

        const ctasToRender = Object.values(uniqueCTAs);

        // Fallback: If only "View Candidates" is present, add "View Electoral Rules"
        if (ctasToRender.length === 1 && Object.keys(uniqueCTAs)[0] === 'candidates') {
             const rulesCta = (
                 <Button 
                     key="rules-fallback"
                     asChild 
                     size="lg" 
                     variant="secondary"
                     className="bg-white/30 hover:bg-white/40 text-white border border-white/50 shadow-lg text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                 >
                     <Link to="/rules">
                         <FileText className="w-5 h-5 mr-2" /> View Electoral Rules
                     </Link>
                 </Button>
             );
             ctasToRender.unshift(rulesCta); 
        }

        return (
            <div className="flex flex-wrap justify-center gap-4 pt-4 pb-8">
                {ctasToRender}
            </div>
        );
    };

    return (
        <section className="relative min-h-screen sm:min-h-[85vh] flex items-center justify-center px-4 py-16 sm:py-20 overflow-hidden">
            
            
            {/* Background Image and Gradient Overlay (Darker and slightly purple tint for authority) */}
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroBackground})` }}></div>
            {/* Added a subtle gradient for a deep, professional look */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-gray-900/95"></div>
            
            <div className="relative container mx-auto pt-16 pb-8 md:py-24">
                <div className="max-w-5xl mx-auto text-center text-white space-y-6 sm:space-y-8 animate-fade-in">
                    
                    {/* Informative Badge */}
                    <Badge variant="outline" className="text-sm px-4 py-1.5 border-2 border-white/50 text-white bg-white/10 backdrop-blur-sm transition duration-300 hover:bg-white/20">
                        Official NUNSA E-Voting Platform
                    </Badge>
                    
                    {/* Main Headings */}
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight drop-shadow-2xl">
                        VOTE. LEAD. INSPIRE.
                    </h1>
                    
                    <p className="text-lg md:text-xl font-medium opacity-90 max-w-4xl mx-auto leading-relaxed mt-4">
                        Welcome to NUNSA's secure e-voting platform. **Cast your ballot with confidence** and follow the electoral process in real-time.
                    </p>

                    {/* DYNAMIC CALL-TO-ACTION BUTTONS */}
                    {renderCTAs()} 

                    {/* COUNTDOWN SECTION (Frosted Glass Card) */}
                    <div className="flex justify-center w-full pt-6 pb-10">
                        <div className="w-full max-w-2xl p-4 sm:p-6 rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm shadow-2xl transition duration-300 hover:border-white/50">
                            {/* CurrentStageCountdown component is rendered here */}
                            <CurrentStageCountdown />
                        </div>
                    </div>
                    
                    {/* Security Assurance Footer */}
                    <div className="pt-8 flex items-center justify-center gap-3 text-sm sm:text-base text-white/80">
                        <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="font-semibold">Secured by Technology.</span> 
                        <span>100% Transparent and Anonymous.</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;