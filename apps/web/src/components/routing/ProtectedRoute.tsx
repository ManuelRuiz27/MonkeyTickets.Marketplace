import { Navigate, useLocation } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: ReactElement;
    roles: string[];
    redirectTo: string;
}

export function ProtectedRoute({ children, roles, redirectTo }: ProtectedRouteProps) {
    const location = useLocation();
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">Cargando...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    if (!roles.includes((user.role || '').toUpperCase())) {
        return <Navigate to="/" replace />;
    }

    return children;
}
