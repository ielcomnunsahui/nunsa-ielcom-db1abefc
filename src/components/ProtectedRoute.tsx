import { useEffect, useState, useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth"; 
import { Link } from "react-router-dom";

// Simplified Role Types - Only 'general' and 'admin'
type UserRole = 'admin' | 'general' | null;

// The ProtectedRoute Component
interface ProtectedRouteProps {
    allowedRoles?: UserRole[]; // Optional: restrict access to certain roles
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const { user, role, isLoading } = useAuth();
    const location = useLocation();

    // ------------------------------------
    // 1. Loading State
    // ------------------------------------
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="mt-4 text-gray-600 dark:text-gray-300">Securing session...</p>
            </div>
        );
    }
    
    // ------------------------------------
    // 2. Unauthenticated Check
    // ------------------------------------
    if (!user) {
        // Redirect to login, saving the protected path in state to return later
        return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />;
    }

    // ------------------------------------
    // 3. Role/Authorization Check
    // ------------------------------------
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        // User is logged in but does not have the required role (e.g., General user accessing Admin page)
        return (
            <div className="min-h-screen flex flex-col justify-center items-center p-8 text-center bg-red-50 dark:bg-red-900/10">
                <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                    You do not have the required permissions to view this page.
                </p>
                <Link to="/" className="mt-4 text-indigo-600 hover:underline">Go to Home</Link>
            </div>
        );
    }

    // ------------------------------------
    // 4. Authorized: Render Child Routes
    // ------------------------------------
    return <Outlet />;
};

export default ProtectedRoute;