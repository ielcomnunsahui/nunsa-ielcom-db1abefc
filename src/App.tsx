import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Results from "./pages/Results";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AspirantLogin from "./pages/AspirantLogin";
import Vote from "./pages/SecureVote";
import VotersLogin from "./pages/VotersLogin";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import SetupAdmin from "./pages/SetupAdmin";
import SupportPage from "./pages/SupportPage";
import Rules from "./pages/Rules";
import AspirantDashboard from "./pages/AspirantDashboard";
import AspirantApplication from "./pages/AspirantApplication";
import PublicCandidatesView from "./pages/PublicCandidatesView";
import PublicResults from "./pages/PublicResults";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public routes - no authentication required */}
          
          <Route path="/results" element={<Results />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/aspirant-login" element={<AspirantLogin />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/candidates" element={<PublicCandidatesView />} />
          <Route path="/setup-admin" element={<SetupAdmin />} />
          <Route path="/public-results" element={<PublicResults />} />
          
            <Route path="/register" element={<Register />} />
            
            <Route path="/voters-login" element={<VotersLogin />} />
            
            <Route path="/aspirant/apply" element={<AspirantApplication />} />
         
          {/* Protected routes for general authenticated users */}
          <Route element={<ProtectedRoute allowedRoles={['general', 'admin']} />}>
          <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/aspirant" element={<AspirantDashboard />} />
            <Route path="/vote" element={<Vote />} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
          
          {/* CATCH-ALL ROUTE (MUST remain last) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;