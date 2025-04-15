import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    useEffect(() => {
        console.log("ProtectedRoute check:", { 
            path: location.pathname,
            isAuthenticated,
            user: user ? `${user.email} (admin: ${user.is_admin})` : 'none'
        });
    }, [isAuthenticated, user, location.pathname]);

    if (!isAuthenticated) {
        console.log("Not authenticated, redirecting to login");
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (requireAdmin && !user?.is_admin) {
        console.log("User is not admin, redirecting to unauthorized");
        return <Navigate to="/unauthorized" replace />;
    }

    console.log("Authentication check passed, rendering protected content");
    return <>{children}</>;
} 