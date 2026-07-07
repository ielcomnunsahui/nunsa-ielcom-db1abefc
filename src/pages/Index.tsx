import { useEffect, useState } from "react"; 
import { supabase } from "@/integrations/supabase/client"; 
import { Link } from "react-router-dom"; 
import Navbar from "@/components/Navbar";
import Footer from "@/components/footerr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrentStageCountdown } from "@/components/CurrentStageCountdown"; 
import ElectionTimeline from "@/components/ElectionTimeline"; 
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"; 
import { 
    UserPlus, Scale, Shield, Trophy, Eye, HelpCircle, MessageCircle, // General Icons
    Vote, TrendingUp, Users, FileText, Loader2, CheckCircle2 as CheckCircle,
    ChevronDown, User, User2 // Icons for committee section
} from "lucide-react"; 
import heroBackground from "@/assets/herobg.jpg"; 
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


// --- IMAGE IMPORTS ---
// NOTE: These paths are used as specified by the user. If they are not accessible, 
// the fallback icon logic in CommitteeMemberCard will display a placeholder.
import chairmanImage from "@/assets/chairman.png";
import deputyChairmanImage from "@/assets/deputychairman.jpg";
import secretaryImage from "@/assets/secretary.jpg";
import girkaImage from "@/assets/girka.jpg";
import simbiatImage from "@/assets/simbiat.jpg";
import jubrilImage from "@/assets/jubril.jpg";


// --- TYPE DEFINITIONS ---
interface Stage {
    id: string;
    stage_name: string;
    start_time: string;
    end_time: string;
    created_at: string;
    is_active: boolean; 
}

interface CommitteeMember {
    role: string;
    name: string;
    level: string;
    faculty: string;
    image: string | null;
}

// --- COMMITTEE MEMBER DATA ---
const committeeMembers: CommitteeMember[] = [
    { 
        role: "Chairman", 
        name: "Awwal Abubakar Sadik", 
        level: "500L", 
        faculty: "Nursing Science", 
        image: chairmanImage 
    },
    { 
        role: "Deputy Chairman", 
        name: "Abdulhameed Sherifat O.", 
        level: "500L", 
        faculty: "Nursing Science", 
        image: deputyChairmanImage 
    },
    { 
        role: "Secretary", 
        name: "Yisa-Apata Islamiat T.", 
        level: "300L", 
        faculty: "Nursing Science", 
        image: secretaryImage 
    },
    { 
        role: "Treasurer", 
        name: "Musa Zulaihat Dalhatu", 
        level: "500L", 
        faculty: "Nursing Science", 
        image: null // Placeholder used as requested
    },
    { 
        role: "Electoral Organizer", 
        name: "Ahmad Usman Girka", 
        level: "400L", 
        faculty: "Nursing Science", 
        image: girkaImage 
    },
    { 
        role: "P.R.O I", 
        name: "Olokor Simbiat", 
        level: "400L", 
        faculty: "Nursing Science", 
        image: simbiatImage 
    },
    { 
        role: "P.R.O II", 
        name: "Lawal Jubril Opeyemi", 
        level: "300L", 
        faculty: "Nursing Science", 
        image: jubrilImage 
    },
];

// --- COMMITTEE MEMBER CARD COMPONENT ---
const CommitteeMemberCard = ({ role, name, level, faculty, image }: CommitteeMember) => {
    // Basic heuristic to determine male/female placeholder for missing image
    const isFemale = name.includes("Sherifat") || name.includes("Islamiat") || name.includes("Zulaihat") || name.includes("Simbiat");
    
    return (
        <Card className="p-4 flex flex-col items-center text-center hover:shadow-xl transition-shadow duration-300">
            <div className={`w-24 h-24 rounded-full overflow-hidden mb-3 border-4 ${image ? 'border-primary' : isFemale ? 'border-pink-500/50' : 'border-gray-500/50'} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
                {image ? (
                    <img 
                        src={image} 
                        alt={role} 
                        className="w-full h-full object-cover"
                        // Fallback in case image fails to load
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none'; // Hide broken image
                            // Show placeholder instead
                            target.parentElement!.innerHTML = isFemale 
                                ? '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-2 w-12 h-12 text-pink-500/70"><circle cx="12" cy="5" r="3"/><path d="M14 22v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><path d="M20 22v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 5.74"/></svg>'
                                : '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user w-12 h-12 text-gray-500/70"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                            target.parentElement!.className += ' flex items-center justify-center';
                        }}
                    />
                ) : (
                    // Placeholder icon for missing image (Treasurer)
                    isFemale ? <User2 className="w-12 h-12 text-pink-500/70" /> : <User className="w-12 h-12 text-gray-500/70" />
                )}
            </div>
            <h4 className="font-bold text-lg text-foreground">{role}</h4>
            <p className="text-sm font-semibold text-primary mt-1">{name}</p>
            <p className="text-xs text-muted-foreground">{level}, {faculty}</p>
        </Card>
    );
};


// --- MAIN INDEX COMPONENT ---
const Index = () => {
    
    // --- Hero State & Fetching Logic ---
    const [activeStages, setActiveStages] = useState<Stage[]>([]); 
    const [isLoadingStage, setIsLoadingStage] = useState(true);

    useEffect(() => {
        const fetchAndFilterActiveStages = async () => {
            setIsLoadingStage(true);
            const now = new Date(); 

            try {
                const { data: allStages, error } = await supabase
                    .from("election_timeline")
                    .select("*")
                    .order("start_time", { ascending: true }); 

                if (error) throw error;
                
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

    // --- Dynamic CTA Rendering Logic ---
    const renderCTAs = () => {
        if (isLoadingStage) {
            return (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
            );
        }

        const uniqueCTAs: { [key: string]: React.ReactElement } = {};
        let primaryCtaPresent = false; 

        activeStages.forEach(stage => {
            const stageName = stage.stage_name.toLowerCase();
            let ctaKey = ''; 
            let ctaElement: React.ReactElement | null = null;
            
            switch (stageName) {
                case 'registration period':
                    primaryCtaPresent = true;
                    ctaKey = 'register';
                    ctaElement = (
                        <Button 
                            key={ctaKey} asChild size="lg" 
                            className="bg-green-500 hover:bg-green-600 text-white shadow-xl text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                        >
                            <Link to="/register"><UserPlus className="w-5 h-5 mr-2" /> Register to Participate</Link>
                        </Button>
                    );
                    break;

                case 'application period':
                    primaryCtaPresent = true;
                    ctaKey = 'apply';
                    ctaElement = (
                        <Button 
                            key={ctaKey} asChild size="lg" 
                            className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-xl text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                        >
                            <Link to="/aspirant"><Trophy className="w-5 h-5 mr-2" /> Apply for Position</Link>
                        </Button>
                    );
                    break;

                case 'voting period':
                    primaryCtaPresent = true;
                    ctaKey = 'vote';
                    ctaElement = (
                        <Button 
                            key={ctaKey} asChild size="lg" 
                            className="bg-red-600 hover:bg-red-700 text-white shadow-xl text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                        >
                            <Link to="/vote"><Vote className="w-5 h-5 mr-2" /> Cast Your Vote Now</Link>
                        </Button>
                    );
                    break;

                case 'results publication':
                    primaryCtaPresent = true;
                    ctaKey = 'results';
                    ctaElement = (
                        <Button 
                            key={ctaKey} asChild size="lg" 
                            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 shadow-xl text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                        >
                            <Link to="/results"><TrendingUp className="w-5 h-5 mr-2" /> View Election Results</Link>
                        </Button>
                    );
                    break;
            }

            if (ctaElement) {
                uniqueCTAs[ctaKey] = ctaElement;
            }
        });
        
        // --- Permanent Secondary CTAs ---

        // 1. View Candidates
        uniqueCTAs['candidates'] = (
            <Button 
                key="candidates" asChild size="lg" 
                className="bg-white/20 hover:bg-white/30 text-white border border-white/50 shadow-lg text-base h-12 w-full sm:w-56 transition-transform transform hover:scale-[1.03]"
            >
                <Link to="/candidates"><Users className="w-5 h-5 mr-2" /> View Candidates</Link>
            </Button>
        );

        // 2. Need Support
        uniqueCTAs['support'] = (
            <Button 
                key="support" asChild size="lg" 
                className="bg-white/20 hover:bg-white/30 text-white border border-white/50 shadow-lg text-base h-12 w-full sm:w-56 transition-transform transform hover:scale-[1.03]"
            >
                <Link to="/support"><MessageCircle className="w-5 h-5 mr-2" /> Need Support?</Link>
            </Button>
        );

        const ctasToRender = Object.values(uniqueCTAs);

        // Fallback: If no stage-specific CTA is present, add "View Electoral Rules"
        if (!primaryCtaPresent) {
             const rulesCta = (
                 <Button 
                     key="rules-fallback" asChild size="lg" 
                     className="bg-white/30 hover:bg-white/40 text-white border border-white/50 shadow-lg text-base h-12 w-full sm:w-64 transition-transform transform hover:scale-[1.03]"
                 >
                     <Link to="/rules"><FileText className="w-5 h-5 mr-2" /> View Electoral Rules</Link>
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
    // --- End Dynamic CTA Rendering Logic ---

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            
            <Navbar />
            
            <main>
                
                {/* ========================================================= */}
                {/* 1. HERO SECTION (High-Impact Introduction) */}
                {/* ========================================================= */}
                <section className="relative min-h-screen sm:min-h-[85vh] flex items-center justify-center px-4 py-16 sm:py-20 overflow-hidden">
                    
                    {/* Background Image and Gradient Overlay */}
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroBackground})` }}></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-gray-900/95"></div>
                    
                    <div className="relative container mx-auto pt-16 pb-8 md:py-24">
                        <div className="max-w-5xl mx-auto text-center text-white space-y-6 sm:space-y-8 animate-fade-in">
                            
                            <Badge variant="outline" className="text-sm px-4 py-1.5 border-2 border-white/50 text-white bg-white/10 backdrop-blur-sm transition duration-300 hover:bg-white/20">
                                Official NUNSA E-Voting Platform
                            </Badge>
                            
                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight drop-shadow-2xl">
                                VOTE. LEAD. INSPIRE.
                            </h1>
                            
                            <p className="text-lg md:text-xl font-medium opacity-90 max-w-4xl mx-auto leading-relaxed mt-4">
                                Welcome to NUNSA's secure e-voting platform. Cast your ballot with confidence and follow the electoral process in real-time.
                            </p>
                            
                            {/* COUNTDOWN SECTION */}
                            <div className="flex justify-center w-full pt-6 pb-10">
                                <div className="w-full max-w-2xl">
                                    <CurrentStageCountdown />
                                </div>
                            </div>
                            

                            {/* DYNAMIC CALL-TO-ACTION BUTTONS */}
                            {renderCTAs()} 

                            {/* Security Assurance Footer */}
                            <div className="pt-8 flex items-center justify-center gap-3 text-sm sm:text-base text-white/80">
                                <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="font-semibold">100% Transparent and Anonymous.</span> 
                              
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* ========================================================= */}
                {/* 2. ELECTORAL COMMITTEE (Collapsible) */}
                {/* ========================================================= */}
                <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950">
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12 text-foreground">
                            Meet the Electoral Committee ⚖️
                        </h2>
                        
                        <Collapsible className="w-full">
                            <CollapsibleTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className="w-full py-6 text-lg font-semibold flex justify-between items-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
                                >
                                    {/* Mobile-Friendly Text Switch */}
                                    <span className="sm:hidden text-base font-bold">
                                        View Committee Members ({committeeMembers.length})
                                    </span>
                                    <span className="hidden sm:block">
                                        Click to View All Committee Members ({committeeMembers.length})
                                    </span>
                                    <ChevronDown className="w-5 h-5 transition-transform data-[state=open]:rotate-180" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="CollapsibleContent pt-8">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {committeeMembers.map((member) => (
                                        <CommitteeMemberCard key={member.name} {...member} />
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                </section>
                
                
                {/* ========================================================= */}
                {/* 4. ELECTORAL TIMELINE */}
                {/* ========================================================= */}
                <section className="py-16 md:py-24 px-4 bg-gray-100 dark:bg-gray-800">
                    
                         
                        <ElectionTimeline />
                   
                </section>
                

          {/* Quick Navigation (Hidden in print) */}
          <div className="max-w-5xl mx-auto mt-16 print:hidden">
            <Card className="rounded-2xl shadow-xl">
              <CardHeader className="p-6 pb-0">
                 <CardTitle className="text-center text-2xl">Quick Navigation</CardTitle>
                 <CardDescription className="text-center">Jump to key election pages.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              
                  
                  <Link
                    to="/register"
                    className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                      <UserPlus className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-center text-sm">Register to Vote</p>
                  </Link>
                  
                  <Link
                    to="/aspirant-login"
                    className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-center text-sm">Apply for Position</p>
                  </Link>

                  <Link
                    to="/rules"
                    className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-[#0f7cff] rounded-xl flex items-center justify-center group-hover:bg-[#0d6edb] transition-colors">
                      <Scale className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-center text-sm">View Electoral Rules</p>
                  </Link>

                  <Link
                    to="/support"
                    className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                      <HelpCircle className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-center text-sm">View Support Center</p>
                  </Link>
                  
                </div>
              </CardContent>
            </Card>
            </div>

            </main>
            
            <Footer />
        </div>
    );
};

export default Index;