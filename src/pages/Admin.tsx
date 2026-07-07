import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, Trophy, Calendar, FileText, Loader2, Award, Clock, GraduationCap, Shield, RefreshCw } from "lucide-react";

// Assuming these external components exist and are working
import { AdminCandidates } from "@/components/admin/AdminCandidates";
import { AdminVoters } from "@/components/admin/AdminVoters";
import { AdminTimeline } from "@/components/admin/AdminTimeline";
import { AdminAuditLog } from "@/components/admin/AdminAuditLog";
import { AdminPositions } from "@/components/admin/AdminPositions";
import { AdminStudentRoster } from "@/components/admin/AdminStudentRoster";
import { AdminAspirants } from "@/components/admin/AdminAspirants";
import { AdminLiveResults } from "@/components/admin/AdminLiveResults";

// Placeholder for the external logo asset
import NUNSALogo from "@/assets/Ielcom-logo.png"; 

// --- Configuration for Tabs (Modular) ---
const TABS_CONFIG = [
  { value: "Live Results", label: "Live Results", icon: Calendar, component: AdminLiveResults },
  { value: "positions", label: "Positions", icon: Award, component: AdminPositions },
  { value: "aspirants", label: "Aspirants", icon: Trophy, component: AdminAspirants },
  { value: "candidates", label: "Candidates", icon: Users, component: AdminCandidates },
  { value: "roster", label: "Student Roster", icon: GraduationCap, component: AdminStudentRoster },
  { value: "voters", label: "Voter Mgmt", icon: Users, component: AdminVoters },
  { value: "timeline", label: "Timeline", icon: Clock, component: AdminTimeline },
  { value: "audit", label: "Audit Logs", icon: FileText, component: AdminAuditLog },
];

interface Stats {
  totalVoters: number;
  votedCount: number;
  totalCandidates: number;
  totalPositions: number;
}

// --- Responsive Stat Card Component ---
const StatCard: React.FC<{ icon: React.ElementType, title: string, value: number | string, color: string, delay: string }> = ({ icon: Icon, title, value, color, delay }) => (
  <Card className="p-4 sm:p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] animate-fade-in" style={{ animationDelay: delay }}>
    <div className="flex items-center gap-3">
      <div className={`p-2 sm:p-3 rounded-lg ${color} text-white shadow-md flex-shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{value}</p>
      </div>
    </div>
  </Card>
);

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalVoters: 0,
    votedCount: 0,
    totalCandidates: 0,
    totalPositions: 0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Data Fetching Logic ---
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const [votersResult, candidatesResult, positionsResult] = await Promise.all([
        supabase.from("voters").select("voted", { count: "exact" }),
        supabase.from("candidates").select("*", { count: "exact" }),
        supabase.from("positions").select("*", { count: "exact" }),
      ]);

      const votedCount = votersResult.data?.filter((v: { voted: boolean }) => v.voted).length || 0;

      setStats({
        totalVoters: votersResult.count || 0,
        votedCount,
        totalCandidates: candidatesResult.count || 0,
        totalPositions: positionsResult.count || 0,
      });

    } catch (error) {
      console.error("Error fetching election stats:", error);
      toast({
        title: "Stats Error",
        description: "Failed to load up-to-date election statistics.",
        variant: "destructive",
      });
    } finally {
      setIsStatsLoading(false);
    }
  }, [toast]);


  const checkAdminAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        navigate("/admin-login");
        return;
      }

      setUser(authUser);

      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!adminData) {
        toast({
          title: "Access Denied",
          description: "You do not have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchStats();

    } catch (error) {
      console.error("Error checking admin auth:", error);
      toast({
        title: "Authentication Error",
        description: "Failed to verify admin access.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  // --- Calculated Value ---
  const voterTurnout = useMemo(() => {
    if (stats.totalVoters === 0) return "0.00";
    return ((stats.votedCount / stats.totalVoters) * 100).toFixed(2);
  }, [stats.votedCount, stats.totalVoters]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-24 px-4 pb-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600 font-medium">Verifying admin credentials...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* FIX: Increased top padding for mobile (pt-20) to ensure the fixed Navbar 
        does not obscure the dashboard header.
      */}
      <main className="pt-20 sm:pt-24 px-2 sm:px-4 pb-12"> 
        <div className="container mx-auto max-w-7xl">
          
          {/* Dashboard Header (Mobile Optimized) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-8 p-3 sm:p-6 bg-white rounded-xl shadow-lg border-b-4 border-blue-600">
            <div className="flex items-center gap-3">
              <img 
                src={NUNSALogo}
                alt="NUNSA Logo" 
                className="w-auto h-12 sm:h-16 object-contain flex-shrink-0" 
              />
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900">
                  Electoral Admin System
                </h1>
                <p className="text-sm sm:text-md text-gray-600 flex items-center">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-600"/>
                    Management Dashboard
                </p>
              </div>
            </div>
            <Button 
                onClick={() => navigate("/public-results")} 
                variant="default" 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md px-4 py-2 w-full sm:w-auto"
            >
              Public Results
            </Button>
          </div>

          {/* Stats Cards with Refresh (Mobile Optimized) */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">Key Metrics</h2>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchStats}
                disabled={isStatsLoading}
            >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${isStatsLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Stats</span>
                <span className="inline sm:hidden">Refresh</span>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8">
            <StatCard 
              icon={Users} 
              title="Total Voters" 
              value={stats.totalVoters} 
              color="bg-indigo-500"
              delay="0s"
            />
            <StatCard 
              icon={Trophy} 
              title="Total Positions" 
              value={stats.totalPositions} 
              color="bg-green-500"
              delay="0.1s"
            />
            <StatCard 
              icon={Users} 
              title="Votes Cast" 
              value={stats.votedCount} 
              color="bg-yellow-500"
              delay="0.2s"
            />
            <StatCard 
              icon={Award} 
              title="Turnout" 
              value={`${voterTurnout}%`} 
              color="bg-red-500"
              delay="0.3s"
            />
          </div>

          {/* Tabs for different admin functions */}
          <Card className="p-1 sm:p-2 md:p-6 shadow-xl border">
            <Tabs defaultValue="overview" className="w-full">
              
              {/* Responsive Tabs List: Scrollable for mobile */}
              <TabsList className="flex w-full overflow-x-auto justify-start h-auto p-1 bg-gray-100 rounded-lg border">
                {TABS_CONFIG.map((tab) => (
                    <TabsTrigger 
                        key={tab.value} 
                        value={tab.value} 
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-colors"
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="inline sm:hidden">{tab.label.split(' ')[0]}</span> 
                    </TabsTrigger>
                ))}
              </TabsList>

              {/* Tabs Content */}
              {TABS_CONFIG.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="space-y-4 pt-4 sm:pt-6">
                    {tab.value === "Live Results" ? (
                        // Special Layout for Live Results (Full-width)
                        <Card className="p-2 sm:p-4 md:p-6 shadow-inner bg-white border-none">
                            {tab.component && <tab.component />}
                        </Card>
                    ) : (
                        // Dynamic Component Loading (Full-width card)
                        <Card className="p-2 sm:p-4 md:p-6 shadow-inner bg-white border-none">
                            {tab.component && <tab.component />}
                        </Card>
                    )}
                </TabsContent>
              ))}
            </Tabs>
          </Card>

          {/* Footer Notice */}
          <Card className="p-4 mt-6 bg-blue-50/50 border-blue-200">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1 text-gray-800 text-sm">Admin Security Notice</h3>
                <p className="text-xs text-gray-600">
                  You are logged in with elevated privileges. All actions are logged and traceable within the **Audit Logs** tab.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;