import { Navigate } from 'react-router-dom';

interface RPProtectedRouteProps {
    children: React.ReactNode;
}

export function RPProtectedRoute({ children }: RPProtectedRouteProps) {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('authUser');

    if (!token || !userStr) {
        return <Navigate to="/rp/login" replace />;
    }

    try {
        const user = JSON.parse(userStr);

        if (user.role !== 'RP') {
            return <Navigate to="/rp/login" replace />;
        }

        return <>{children}</>;
    } catch {
        return <Navigate to="/rp/login" replace />;
    }
}
