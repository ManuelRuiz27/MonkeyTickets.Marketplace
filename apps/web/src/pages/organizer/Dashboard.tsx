import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DashboardMetrics } from '../../components/organizer/DashboardMetrics';
import { SalesChart } from '../../components/organizer/SalesChart';
import { GenerateCortesiasModal } from '../../components/organizer/GenerateCortesiasModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState, EmptyIcons } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';

export function OrganizerDashboard() {
    const navigate = useNavigate();
    const toast = useToast();
    const [summary, setSummary] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Cortesías Modal State
    const [showCortesiasModal, setShowCortesiasModal] = useState(false);
    const [selectedEventForCortesias, setSelectedEventForCortesias] = useState<{ id: string; title: string } | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [summaryData, eventsData] = await Promise.all([
                apiClient.getOrganizerSummary(),
                apiClient.getOrganizerEvents()
            ]);
            setSummary(summaryData);
            setEvents(eventsData);
        } catch (err) {
            setError('Error al cargar los datos del panel');
            toast.error('No se pudieron cargar los datos del panel');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCortesias = (event: any) => {
        setSelectedEventForCortesias({ id: event.id, title: event.title });
        setShowCortesiasModal(true);
    };

    const handleCopyUnlistedLink = (accessToken: string) => {
        const link = `${window.location.origin}/events/unlisted/${accessToken}`;
        navigator.clipboard.writeText(link);
        toast.success('✅ Enlace copiado al portapapeles');
    };

    // Prepare chart data: Revenue by Event
    const chartData = events.map(event => ({
        name: event.title,
        sales: event.templates?.reduce((acc: number, t: any) => acc + ((t.sold || 0) * Number(t.price)), 0) || 0
    })).sort((a, b) => b.sales - a.sales).slice(0, 10); // Top 10 events

    return (
        <DashboardLayout type="organizer" user={{ email: summary?.businessName }}>
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
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            {summary && <p className="text-gray-500">{summary.businessName}</p>}
                        </div>
                        <Button variant="primary" onClick={() => navigate('/organizer/events/create')}>
                            + Crear Evento
                        </Button>
                    </div>

                    {/* Metrics Cards */}
                    {summary && (
                        <DashboardMetrics
                            stats={summary.stats}
                            cortesias={summary.cortesias}
                        />
                    )}

                    {/* Charts & Tables Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Sales Chart */}
                        {chartData.length > 0 ? (
                            <SalesChart data={chartData} />
                        ) : (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Evento</h3>
                                <EmptyState
                                    icon={<EmptyIcons.Calendar />}
                                    title="No hay datos de ventas"
                                    description="Crea tu primer evento para ver métricas aquí"
                                />
                            </div>
                        )}

                        {/* Recent Events List */}
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Eventos Recientes</h3>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/organizer/events')}>
                                    Ver todos →
                                </Button>
                            </div>
                            {events.length === 0 ? (
                                <div className="p-6">
                                    <EmptyState
                                        icon={<EmptyIcons.Calendar />}
                                        title="No tienes eventos"
                                        description="Crea tu primer evento para comenzar"
                                        action={
                                            <Button variant="primary" onClick={() => navigate('/organizer/events/create')}>
                                                Crear Evento
                                            </Button>
                                        }
                                    />
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {events.slice(0, 5).map((event) => (
                                        <li key={event.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center flex-1 min-w-0">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-full object-cover" src={event.coverImage || 'https://via.placeholder.com/40'} alt="" />
                                                    </div>
                                                    <div className="ml-4 flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-indigo-600 truncate">{event.title}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(event.startDate).toLocaleDateString()}
                                                        </div>
                                                        {/* Unlisted Badge & Link */}
                                                        {(event.isUnlisted || !event.isPublic) && event.accessToken && (
                                                            <div className="mt-1 flex items-center space-x-2">
                                                                <Badge variant="default" size="sm">
                                                                    🔒 Oculto
                                                                </Badge>
                                                                <button
                                                                    onClick={() => handleCopyUnlistedLink(event.accessToken)}
                                                                    className="text-xs text-indigo-600 hover:text-indigo-900 flex items-center"
                                                                    title="Copiar enlace de acceso"
                                                                >
                                                                    📋 Copiar Link
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-2 flex-shrink-0 flex flex-col items-end space-y-2">
                                                    <Badge
                                                        variant={event.status === 'PUBLISHED' ? 'success' : 'warning'}
                                                        size="sm"
                                                    >
                                                        {event.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                                                    </Badge>
                                                    <div className="flex space-x-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleOpenCortesias(event)}
                                                        >
                                                            Cortesías
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => navigate(`/organizer/events/${event.id}/metrics`)}
                                                        >
                                                            Métricas
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cortesías Modal */}
            {selectedEventForCortesias && (
                <GenerateCortesiasModal
                    isOpen={showCortesiasModal}
                    onClose={() => setShowCortesiasModal(false)}
                    eventId={selectedEventForCortesias.id}
                    eventTitle={selectedEventForCortesias.title}
                    onSuccess={() => {
                        loadDashboardData(); // Reload stats
                    }}
                />
            )}
        </DashboardLayout>
    );
}
