import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { GlobalKPIs } from '../../components/director/GlobalKPIs';
import { TopOrganizersTable } from '../../components/director/TopOrganizersTable';
import { TopEventsTable } from '../../components/director/TopEventsTable';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useToast } from '../../hooks/useToast';

export function DirectorDashboardPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [metrics, setMetrics] = useState<any>(null);
    const [topOrganizers, setTopOrganizers] = useState<any[]>([]);
    const [topEvents, setTopEvents] = useState<any[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError('');

            const [overview, organizers, events] = await Promise.all([
                apiClient.getDirectorOverview(),
                apiClient.getDirectorTopOrganizers({ limit: 5 }),
                apiClient.getDirectorTopEvents({ limit: 5 }),
            ]);

            setMetrics({
                organizers: {
                    total: overview.activeOrganizers,
                    active: overview.activeOrganizers,
                    pending: 0,
                    suspended: 0,
                },
                events: {
                    total: overview.activeEvents,
                    active: overview.activeEvents,
                },
                tickets: {
                    sold: overview.totalTicketsSold,
                },
                revenue: {
                    platformFees: overview.platformRevenue,
                    organizersIncome: overview.totalGrossSales - overview.platformRevenue,
                    totalProcessed: overview.totalGrossSales,
                },
            });

            setTopOrganizers(organizers);
            setTopEvents(events);
        } catch (err: any) {
            setError(err.message || 'Error al cargar el panel');
            toast.error('Error al cargar los datos del panel');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout type="director" user={{ email: localStorage.getItem('authUser') || 'Director' }}>
            {loading ? (
                <div className="space-y-6">
                    <LoadingSkeleton height={120} count={4} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <LoadingSkeleton height={300} />
                        <LoadingSkeleton height={300} />
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
            ) : (
                <div className="space-y-8">
                    {/* Header Actions */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard Global</h1>
                            <p className="text-gray-500">Visión completa de la plataforma</p>
                        </div>
                        <div className="flex space-x-3">
                            <Button variant="outline" onClick={() => navigate('/director/organizers')}>
                                👥 Organizadores
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/director/fee-plans')}>
                                💰 Fee Plans
                            </Button>
                            <Button variant="primary" onClick={() => navigate('/director/orders')}>
                                📦 Órdenes
                            </Button>
                        </div>
                    </div>

                    {/* Global KPIs */}
                    {metrics && <GlobalKPIs metrics={metrics} />}

                    {/* Top Tables Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <TopOrganizersTable organizers={topOrganizers} />
                        <TopEventsTable events={topEvents} />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button
                                variant="outline"
                                fullWidth
                                onClick={() => navigate('/director/organizers?filter=pending')}
                            >
                                ⏳ Organizadores Pendientes
                            </Button>
                            <Button
                                variant="outline"
                                fullWidth
                                onClick={() => navigate('/director/fee-plans')}
                            >
                                ⚙️ Configurar Fee Plans
                            </Button>
                            <Button
                                variant="outline"
                                fullWidth
                                onClick={() => navigate('/director/orders')}
                            >
                                🔍 Buscar Orden
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
