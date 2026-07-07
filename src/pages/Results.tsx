import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// This component now serves as a router to direct users to appropriate results page
export default function Results() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Not authenticated - redirect to public results
          navigate('/public-results', { replace: true });
          return;
        }

        // Check if user is admin
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (adminData) {
          // User is admin - redirect to admin results
          navigate('/admin', { replace: true });
        } else {
          // Regular user - redirect to public results
          navigate('/public-results', { replace: true });
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        toast({
          title: "Error",
          description: "Failed to determine user access level.",
          variant: "destructive",
        });
        // Default to public results on error
        navigate('/public-results', { replace: true });
      }
    };

    checkUserRole();
  }, [navigate, toast]);

  // Show loading while determining redirect
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to results...</p>
      </div>
    </div>
  );
}