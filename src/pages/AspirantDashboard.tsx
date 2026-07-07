import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, Clock, Users, FileText, Loader2, Calendar, CheckCircle2, 
  AlertCircle, User, DollarSign, Timer, ArrowRight, Mail, Phone, Clock10
} from "lucide-react";
import { Separator } from "@/components/ui/separator"; 

// --- Type Definitions (FIXED: Added user_id) ---

interface Position {
  id: string;
  name: string;
  application_fee: number;
  min_cgpa: number;
  eligible_levels: string[];
  description: string;
  is_open: boolean;
  created_at: string;
  updated_at: string;
  display_order: number;
}

// CRITICAL FIX: Added 'user_id' to link aspirant data to the authenticated Supabase user
interface Aspirant {
  id: string;
  full_name: string;
  matric: string;
  position_id: string;
  user_id: string; // <-- NEW: Use for cross-device identification
  payment_verified: boolean;
  photo_url: string | null;
  admin_review_status: 'pending' | 'approved' | 'rejected' | 'conditional';
  admin_review_notes: string | null;
  screening_scheduled_at: string | null;
  screening_result: 'not_screened' | 'qualified' | 'disqualified' | null;
  conditional_acceptance: boolean;
  conditional_reason: string | null;
  resubmission_deadline: string | null;
  promoted_to_candidate: boolean;
  created_at: string;
  aspirant_positions: { name: string };
}

// --- Helper Functions ---

const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + " at " + date.toLocaleTimeString("en-US", {
      hour: '2-digit',
      minute: '2-digit',
    });
};

const CountdownSegment = ({ value, label }: { value: number; label: string }) => (
  <div className="text-center p-3 bg-primary/10 rounded-xl shadow-inner min-w-[70px]">
    <div className="text-3xl font-extrabold text-primary">{value}</div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
  </div>
);

// --- Component Logic ---

const AspirantDashboard = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [aspirant, setAspirant] = useState<Aspirant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applicationDeadline, setApplicationDeadline] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isApplicationOpen, setIsApplicationOpen] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Data Fetching (FIXED) ---
  const loadDashboardData = useCallback(async () => {
    // Ensure loading state starts
    setIsLoading(true); 

    try {
        // 1. Get the authenticated user from the current session (Cross-device fix)
        const { data: { user } } = await supabase.auth.getUser();

        let existingAspirant: Aspirant | null = null;
        
        if (user) {
            // ** CRITICAL FIX: Query the 'aspirants' table using the authenticated user's ID **
            const { data: aspirantByUserId, error: aspirantError } = await supabase
                .from("aspirants")
                .select(`
                    id, full_name, matric, position_id, payment_verified, admin_review_status, 
                    admin_review_notes, screening_scheduled_at, screening_result, 
                    promoted_to_candidate, created_at, photo_url, conditional_acceptance, 
                    conditional_reason, resubmission_deadline, user_id,
                    aspirant_positions (name)
                `)
                .eq("user_id", user.id) // <-- Using authenticated ID, which is cross-device persistent
                .maybeSingle();

            if (aspirantError) throw aspirantError;
            
            // Bypass TS2589 (deep type instantiation) with 'as any'
            existingAspirant = aspirantByUserId as any as Aspirant; 
        } else {
            // Optional: If no user object (not logged in via Supabase Auth), 
            // fall back to checking local storage (old, unreliable method)
            const matricNumber = localStorage.getItem("aspirantMatric");
            if (matricNumber) {
                 const { data: aspirantByMatric } = await supabase
                    .from("aspirants")
                    .select(`
                        id, full_name, matric, position_id, payment_verified, admin_review_status, 
                        admin_review_notes, screening_scheduled_at, screening_result, 
                        promoted_to_candidate, created_at, photo_url, conditional_acceptance, 
                        conditional_reason, resubmission_deadline, user_id,
                        aspirant_positions (name)
                    `)
                    .eq("matric", matricNumber)
                    .maybeSingle();
                 existingAspirant = aspirantByMatric as any as Aspirant;
            }
        }
        
        if (existingAspirant) {
            setAspirant(existingAspirant);
            // Optionally, save the matric back to local storage for local consistency
            localStorage.setItem("aspirantMatric", existingAspirant.matric);
        } else {
             // If no aspirant data found, ensure the state is clear
             setAspirant(null);
        }
        
        // --- Fetch Positions and Timeline (Original Logic) ---
        const { data: positionsData, error: positionsError } = await supabase
            .from("aspirant_positions")
            .select("*")
            .eq("is_open", true)
            .order("application_fee", { ascending: false });

        if (positionsError) throw positionsError;
        setPositions(positionsData || []);

        const { data: timelineData } = await supabase
            .from("election_timeline")
            .select("*")
            .eq("stage_name", "Application Period")
            .eq("is_active", true)
            .maybeSingle();

        if (timelineData?.end_time) {
            setApplicationDeadline(new Date(timelineData.end_time));
        } else {
            const defaultDeadline = new Date();
            defaultDeadline.setDate(defaultDeadline.getDate() + 30);
            setApplicationDeadline(defaultDeadline);
        }

    } catch (error) {
        console.error("Error loading dashboard:", error);
        toast({
            title: "Error",
            description: "Failed to load dashboard data",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
// CRITICAL FIX: Dependency array added back to fix TS2554
}, [toast]);
  
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // --- Countdown Effect (Kept as is) ---
  useEffect(() => {
    if (!applicationDeadline) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const deadline = applicationDeadline.getTime();
      const difference = deadline - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeRemaining({ days, hours, minutes, seconds });
        setIsApplicationOpen(true);
      } else {
        setTimeRemaining(null);
        setIsApplicationOpen(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [applicationDeadline]);
  
  // --- Status Logic (Kept as is) ---

  const getStatusProgressValue = (aspirant: Aspirant) => {
    if (aspirant.promoted_to_candidate) return 6;
    if (aspirant.screening_result === "qualified") return 5;
    if (aspirant.screening_result === "disqualified") return 5; 
    if (aspirant.screening_scheduled_at) return 4;
    if (aspirant.admin_review_status === "approved" || aspirant.conditional_acceptance) return 3;
    if (aspirant.payment_verified) return 2;
    if (aspirant.created_at) return 1;
    return 0;
  };
  
  const getApplicationStatus = (aspirant: Aspirant) => {
    if (aspirant.promoted_to_candidate) return "Promoted to Candidate";
    if (aspirant.screening_result === "qualified") return "Qualified for Election";
    if (aspirant.screening_result === "disqualified") return "Disqualified";
    if (aspirant.conditional_acceptance) return "Conditional Acceptance";
    if (aspirant.screening_scheduled_at) return "Screening Scheduled";
    if (aspirant.admin_review_status === "approved") return "Admin Approved";
    if (aspirant.admin_review_status === "rejected") return "Application Rejected";
    if (aspirant.payment_verified) return "Payment Verified";
    return "Application Submitted";
  };

  const getStatusColor = (aspirant: Aspirant) => {
    const status = getApplicationStatus(aspirant);
    if (status.includes("Promoted") || status.includes("Qualified")) return "bg-green-600 hover:bg-green-700";
    if (status.includes("Rejected") || status.includes("Disqualified")) return "bg-red-600 hover:bg-red-700";
    if (status.includes("Conditional")) return "bg-amber-500 hover:bg-amber-600";
    return "bg-primary hover:bg-primary/90";
  };
  
  // --- Timeline Stepper Data (Kept as is) ---
  const timelineSteps = [
    { id: 1, name: "Application Submitted", icon: FileText, isComplete: (a: Aspirant) => !!a.created_at },
    { id: 2, name: "Payment Verified", icon: DollarSign, isComplete: (a: Aspirant) => a.payment_verified },
    { id: 3, name: "Admin Review & Approval", icon: User, isComplete: (a: Aspirant) => a.admin_review_status === 'approved' || a.conditional_acceptance },
    { id: 4, name: "Screening Scheduled", icon: Calendar, isComplete: (a: Aspirant) => !!a.screening_scheduled_at },
    { id: 5, name: "Screening Result (Qualified)", icon: CheckCircle2, isComplete: (a: Aspirant) => a.screening_result === 'qualified' },
    { id: 6, name: "Promoted to Candidate", icon: Trophy, isComplete: (a: Aspirant) => a.promoted_to_candidate },
  ];

  // --- Render Timeline Stepper (Kept as is, already mobile-friendly) ---
  const renderTimelineStepper = (aspirant: Aspirant) => {
    const currentStepIndex = getStatusProgressValue(aspirant);

    return (
      <div className="space-y-4 md:space-y-0 md:flex md:flex-col items-start pt-4">
        {timelineSteps.map((step, index) => {
          const isActive = index + 1 <= currentStepIndex;
          const isCurrent = index + 1 === currentStepIndex && currentStepIndex < 6;
          const isFinalDisqualified = aspirant.screening_result === 'disqualified' && index === 4;
          const isDisqualified = aspirant.screening_result === 'disqualified' && index + 1 > currentStepIndex;

          const stepColor = isFinalDisqualified ? 'bg-red-500' : isActive ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700';
          const textColor = isFinalDisqualified ? 'text-red-500 font-semibold' : isActive ? 'text-foreground font-semibold' : 'text-muted-foreground';
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex w-full relative">
              {/* Stepper Line (Adjusted for mobile vertical flow) */}
              {index < timelineSteps.length - 1 && (
                <div 
                  className={`absolute left-[17px] top-9 h-full w-[2px] ${isActive && !isDisqualified ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                />
              )}
              
              <div className="flex items-center space-x-4 pb-8 z-10">
                {/* Icon Circle */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${stepColor}`}>
                  <Icon className={`w-5 h-5 ${isActive || isFinalDisqualified ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`} />
                </div>
                
                {/* Step Content */}
                <div>
                  <h4 className={`text-sm ${textColor}`}>
                    {step.name}
                    {isCurrent && <Badge className="ml-2 bg-primary/10 text-primary">Current</Badge>}
                    {isFinalDisqualified && <Badge className="ml-2 bg-red-500">Disqualified</Badge>}
                  </h4>
                  {index === 0 && <p className="text-xs text-muted-foreground">Date: {new Date(aspirant.created_at).toLocaleDateString()}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // --- Conditional Alert Banner (Kept as is) ---
  const renderConditionalAlert = (aspirant: Aspirant) => {
    if (!aspirant.conditional_acceptance) return null;
    
    return (
      <div className="mt-6 p-4 rounded-xl bg-amber-100 dark:bg-amber-900/30 border border-amber-400">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-300">Conditional Acceptance Required Action!</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Your application has been conditionally accepted. You must **resubmit documents** to meet the requirements.
            </p>
            
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Clock10 className="w-3 h-3"/> DEADLINE: <span className="text-red-600 font-bold">{formatDate(aspirant.resubmission_deadline)}</span>
              </p>
              <p className="text-xs italic text-amber-700 dark:text-amber-400">
                **Reason:** {aspirant.conditional_reason || 'See Admin Notes for details.'}
              </p>
            </div>
            
            <Button variant="outline" size="sm" className="mt-3 bg-amber-500 hover:bg-amber-600 text-white border-amber-500">
              Go to Resubmission Form
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 px-4 pb-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading aspirant dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="pt-24 px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full shadow-lg mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold mb-2 text-foreground">
              Aspirant Dashboard
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Welcome back! Monitor your application status and essential election information below.
            </p>
          </div>

          {/* Application Countdown (Kept responsive) */}
                          {applicationDeadline && (
                            <Card className="p-6 mb-8 animate-fade-in">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                  <Timer className="w-6 h-6 text-primary" />
                                  <h2 className="text-2xl font-bold text-foreground">
                                    {isApplicationOpen ? "Application Deadline" : "Applications Closed"}
                                  </h2>
                                </div>
                                
                                {timeRemaining && isApplicationOpen ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
                                    {/* Added sm:grid-cols-4 for better mobile display of 2x2 grid on small screens */}
                                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                                      <div className="text-2xl font-bold text-primary">{timeRemaining.days}</div>
                                      <div className="text-sm text-muted-foreground">Days</div>
                                    </div>
                                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                                      <div className="text-2xl font-bold text-primary">{timeRemaining.hours}</div>
                                      <div className="text-sm text-muted-foreground">Hours</div>
                                    </div>
                                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                                      <div className="text-2xl font-bold text-primary">{timeRemaining.minutes}</div>
                                      <div className="text-sm text-muted-foreground">Minutes</div>
                                    </div>
                                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                                      <div className="text-2xl font-bold text-primary">{timeRemaining.seconds}</div>
                                      <div className="text-sm text-muted-foreground">Seconds</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center p-4 bg-destructive/10 rounded-lg max-w-lg mx-auto">
                                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                                    <p className="text-destructive font-medium">Application period has ended</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Deadline was: {applicationDeadline.toLocaleDateString()} at {applicationDeadline.toLocaleTimeString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </Card>
                          )}

          {/* Application Status Dashboard (Restructured for Mobile) */}
          {aspirant && (
            <Card className="p-6 mb-8 shadow-2xl border-t-4 border-primary/50">
              {/* Force stack on mobile, use grid on large screens */}
              <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
                
                {/* Column 1: Profile & General Status */}
                {/* Added 'border-b lg:border-b-0' to cleanly separate sections on mobile */}
                <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r lg:pr-6 pb-4 lg:pb-0">
                  <div className="flex flex-col items-center text-center">
                    {/* Profile Picture */}
                    <div className="w-20 h-20 rounded-full bg-muted overflow-hidden border-4 border-primary/50 shadow-md flex-shrink-0 mb-3">
                        {aspirant.photo_url ? (
                            <img src={aspirant.photo_url} alt={aspirant.full_name} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-12 h-12 text-muted-foreground m-4" />
                        )}
                    </div>
                    
                    <h2 className="text-xl font-bold text-foreground">{aspirant.full_name}</h2>
                    <p className="text-sm text-muted-foreground">{aspirant.matric}</p>
                    <Badge className={`text-sm px-3 py-1 mt-3 ${getStatusColor(aspirant)}`}>
                        {getApplicationStatus(aspirant)}
                    </Badge>
                  </div>
                  
                  <Separator className="my-4 lg:hidden"/> {/* Mobile separator */}
                  
                  {/* Summary Details */}
                  <div className="space-y-3 px-2">
                    <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary"/> Applied Position
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm items-center border-b pb-1">
                            <span className="text-muted-foreground">Position:</span>
                            <span className="font-bold text-primary">{aspirant.aspirant_positions?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center border-b pb-1">
                            <span className="text-muted-foreground">Applied On:</span>
                            <span className="font-medium">{new Date(aspirant.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center border-b pb-1">
                            <span className="text-muted-foreground">Payment Status:</span>
                            <span className={`font-bold ${aspirant.payment_verified ? 'text-green-600' : 'text-red-500'}`}>
                                {aspirant.payment_verified ? 'Verified' : 'Pending'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm items-center pb-1">
                            <span className="text-muted-foreground">Screening Result:</span>
                            <span className={`font-bold ${aspirant.screening_result === 'qualified' ? 'text-green-600' : aspirant.screening_result === 'disqualified' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {aspirant.screening_result ? aspirant.screening_result.toUpperCase() : 'N/A'}
                            </span>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Progress Stepper & Feedback */}
                <div className="lg:col-span-2">
                  <h3 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary"/> Application Progress Timeline
                  </h3>
                  
                  <div className="mb-6">
                    {renderTimelineStepper(aspirant)}
                  </div>
                  
                  <Separator className="my-4"/>

                  {/* Conditional Acceptance Alert (High Priority Feedback) */}
                  {renderConditionalAlert(aspirant)}
                  
                  {/* Admin Feedback Notes */}
                  {aspirant.admin_review_notes && (aspirant.admin_review_status === 'rejected' || aspirant.admin_review_status === 'conditional') && (
                    <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border-l-4 border-red-500 shadow-inner">
                        <h4 className="flex items-center gap-2 text-md font-bold text-red-700 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" /> Official Feedback
                        </h4>
                        <p className="text-sm italic text-gray-700 dark:text-gray-300 mt-2">
                            {aspirant.admin_review_notes}
                        </p>
                    </div>
                  )}

                  {/* General Screening Schedule Info */}
                  {aspirant.screening_scheduled_at && aspirant.screening_result !== 'qualified' && aspirant.screening_result !== 'disqualified' && (
                    <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-inner">
                        <h4 className="flex items-center gap-2 text-md font-bold text-blue-700 dark:text-blue-400">
                            <Calendar className="w-4 h-4" /> Screening Scheduled
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Your screening is scheduled for: <span className="font-bold">{formatDate(aspirant.screening_scheduled_at)}</span>. 
                            Please check your email for location and time details.
                        </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Available Positions (New List View Style) */}
          <div className="space-y-6 mt-12">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-primary"/> Open Positions
              </h2>
              {!aspirant && isApplicationOpen && (
                <Button onClick={() => navigate("/aspirant/apply")} className="bg-primary hover:bg-primary/90 text-md py-5 px-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
                  Start Your Application <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>

            {/* List View Style for Open Positions (Single Column for better mobile use) */}
            <div className="grid grid-cols-1 gap-4">
              {positions.map((position, index) => (
                <Card 
                  key={position.id} 
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-all duration-200 transform hover:scale-[1.01] hover:shadow-lg border-l-4 border-secondary"
                  style={{animationDelay: `${index * 0.05}s`}} 
                >
                    {/* Left Section: Title and Compact Details */}
                    <div className="flex-1 w-full sm:w-auto mb-3 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-secondary" />
                        <h3 className="text-lg font-bold text-foreground">{position.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-7 line-clamp-1">{position.description}</p>
                      
                      {/* Compact Details for Mobile/List */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-3 ml-7">
                          <span className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="w-3 h-3 text-primary"/> Fee: <span className="font-semibold text-primary">₦{position.application_fee.toLocaleString()}</span>
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                              <User className="w-3 h-3"/> CGPA: <span className="font-semibold">{position.min_cgpa.toFixed(2)}</span>
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3"/> Levels: <span className="font-semibold">{position.eligible_levels.join(", ")}</span>
                          </span>
                      </div>
                    </div>
                    
                    {/* Right Section: Action Button */}
                    <div className="w-full sm:w-40 flex-shrink-0">
                      {aspirant ? (
                        <Button 
                          disabled 
                          className={`w-full ${aspirant.aspirant_positions?.name === position.name ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} hover:opacity-80`}
                          variant="outline"
                        >
                          {aspirant.aspirant_positions?.name === position.name ? "Applied" : "One Application Only"}
                        </Button>
                      ) : !isApplicationOpen ? (
                        <Button disabled className="w-full bg-red-100 text-red-600 hover:bg-red-100" variant="outline">
                          Closed
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => navigate("/aspirant/apply", { state: { selectedPosition: position } })}
                          className="w-full bg-primary hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                        >
                          Apply Now
                        </Button>
                      )}
                    </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Information Cards (Kept responsive) */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Application Requirements</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Valid NUNSA student with active matric number</li>
                    <li>• Meet minimum CGPA and level requirements</li>
                    <li>• Complete all application steps including payment</li>
                    <li>• Submit required documents (photo, referee form, declaration)</li>
                    <li>• Pass screening interview if selected</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Important Notes</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• You can only apply for one position per election cycle</li>
                    <li>• Application fees are non-refundable</li>
                    <li>• All documents must be submitted before deadline</li>
                    <li>• Screening dates will be communicated via email</li>
                    <li>• Final results will be published on this platform</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AspirantDashboard;