import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { components as ApiComponents } from '@monomarket/contracts';

type ApiUser = ApiComponents['schemas']['User'] & {
    organizer?: ApiComponents['schemas']['Organizer'];
};

interface AuthContextValue {
    user: ApiUser | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string, options?: { expectedRole?: string }) => Promise<ApiUser>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('authUser');
        const storedToken = localStorage.getItem('authToken');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
        }

        setLoading(false);
    }, []);

    const login = async (email: string, password: string, options?: { expectedRole?: string }) => {
        const response = await apiClient.login(email, password);

        if (options?.expectedRole && response.user?.role?.toUpperCase() !== options.expectedRole) {
            throw new Error('Rol no autorizado para este panel');
        }

        localStorage.setItem('authToken', response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        setUser(response.user as ApiUser);
        setToken(response.token);

        return response.user as ApiUser;
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        setUser(null);
        setToken(null);
    };

    const value = useMemo<AuthContextValue>(() => ({
        user,
        token,
        loading,
        login,
        logout,
    }), [user, token, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
