import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Simplified Role Types - Only 'general' and 'admin'
type UserRole = 'admin' | 'general' | null;

// --- The Central useAuth Hook ---
export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserAndRole = async () => {
        setIsLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        if (!authUser) {
            setRole(null);
            setIsLoading(false);
            return;
        }

        // --- Simplified Role Check ---
        let userRole: UserRole = 'general'; // Default to general access for all authenticated users

        // Check for Admin (Only special role)
        const { data: adminData } = await supabase
            .from('admin_users')
            .select('id')
            .eq('user_id', authUser.id)
            .limit(1)
            .single();
        
        if (adminData) {
            userRole = 'admin';
        }

        setRole(userRole);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchUserAndRole();

        // Listen for Auth State Changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                fetchUserAndRole();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return { user, role, isLoading };
};