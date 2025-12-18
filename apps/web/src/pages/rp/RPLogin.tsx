import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

export function RPLogin() {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await apiClient.login(form.email, form.password);

            // Validate RP role
            if ((result.user.role as any) !== 'RP') {
                toast.error('⚠️ Esta cuenta no es de RP. Usa el login principal.');
                setLoading(false);
                return;
            }

            // Store auth data
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('authUser', JSON.stringify(result.user));

            toast.success(`✅ Bienvenido, ${result.user.name}`);
            navigate('/rp/dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Credenciales incorrectas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        🎟️ MonoMarket RP
                    </h1>
                    <p className="text-indigo-200">
                        Acceso para Relaciones Públicas
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        Iniciar Sesión
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="tu-email@ejemplo.com"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={loading}
                            disabled={!form.email || !form.password}
                        >
                            Entrar
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            ¿Olvidaste tu contraseña?{' '}
                            <span className="text-indigo-600">
                                Contacta al organizador
                            </span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <a
                        href="/login"
                        className="text-indigo-200 hover:text-white text-sm"
                    >
                        ← Volver al login principal
                    </a>
                </div>
            </div>
        </div>
    );
}
