import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';

export function RPDashboardPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const [dashboard, setDashboard] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (eventId) {
            loadDashboard();
        }
    }, [eventId]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getRPDashboard(eventId!);
            setDashboard(data);
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const data = await apiClient.exportRPReport(eventId!);
            // TODO: Convertir a CSV o descargar
            console.log('Export data:', data);
            toast.success('Reporte exportado');
        } catch (error: any) {
            toast.error(error.message || 'Error al exportar');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-gray-600">Cargando dashboard...</div>
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Error al cargar dashboard</div>
            </div>
        );
    }

    const { event, summary, rps } = dashboard;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Button
                            variant="ghost"
                            onClick={() => navigate(`/organizer/events/${eventId}`)}
                            className="mb-2"
                        >
                            ← Regresar al evento
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                        <p className="text-gray-600">Dashboard de RPs</p>
                    </div>
                    <Button variant="outline" onClick={handleExport}>
                        📊 Exportar Reporte
                    </Button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-sm font-medium text-gray-600 mb-1">RPs Activos</div>
                        <div className="text-3xl font-bold text-gray-900">{summary.activeRPs}</div>
                        <div className="text-xs text-gray-500 mt-1">de {summary.totalRPs} totales</div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-sm font-medium text-gray-600 mb-1">Boletos Generados</div>
                        <div className="text-3xl font-bold text-blue-600">{summary.totalTicketsGenerated}</div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-sm font-medium text-gray-600 mb-1">Asistencia Real</div>
                        <div className="text-3xl font-bold text-green-600">{summary.totalTicketsUsed}</div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-sm font-medium text-gray-600 mb-1">Tasa Conversión</div>
                        <div className="text-3xl font-bold text-purple-600">{summary.avgConversion.toFixed(1)}%</div>
                        <div className="text-xs text-red-500 mt-1">
                            No-show: {summary.noShowRate.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Tabla de RPs */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Ranking de RPs (Ordenado por Asistencia)
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        RP
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Código
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Generados
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Asistencia
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Conversión
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rps.map((rp: any) => (
                                    <tr key={rp.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {rp.ranking === 1 && <span className="text-2xl mr-2">🥇</span>}
                                                {rp.ranking === 2 && <span className="text-2xl mr-2">🥈</span>}
                                                {rp.ranking === 3 && <span className="text-2xl mr-2">🥉</span>}
                                                <span className="font-semibold text-gray-900">{rp.ranking}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="font-medium text-gray-900">{rp.name}</div>
                                                <div className="text-sm text-gray-500">{rp.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                {rp.code}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                {rp.ticketsGenerated}
                                            </div>
                                            {rp.maxTickets && (
                                                <div className="text-xs text-gray-500">
                                                    Límite: {rp.maxTickets}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-lg font-bold text-green-600">
                                                {rp.ticketsUsed}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                                                {rp.conversionRate.toFixed(1)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span
                                                className={`px-3 py-1 text-xs rounded-full ${rp.isActive
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                {rp.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
