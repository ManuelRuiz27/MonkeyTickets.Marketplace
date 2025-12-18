import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { GenerateTicketModal } from '../../components/rp/GenerateTicketModal';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';

export function RPDashboard() {
    const toast = useToast();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'VALID' | 'USED'>('ALL');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [statsData, ticketsData] = await Promise.all([
                apiClient.getMyStats(),
                apiClient.getMyTickets(),
            ]);
            setStats(statsData);
            setTickets((ticketsData as any)?.tickets || []);
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar datos');
            if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                navigate('/rp/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        navigate('/rp/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🎟️</div>
                    <p className="text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    const filteredTickets = tickets.filter(ticket => {
        if (filter === 'ALL') return true;
        return ticket.status === filter;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="text-3xl">🎟️</div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Dashboard RP
                                </h1>
                                <p className="text-sm text-gray-600">
                                    {stats?.rpProfile?.user?.name || 'Cargando...'}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={handleLogout}>
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Event Info */}
                {stats?.event && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {stats.event.title}
                        </h2>
                        <p className="text-gray-600">Evento activo</p>
                    </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="text-sm text-gray-600 mb-1">Total Generados</div>
                        <div className="text-3xl font-bold text-gray-900">
                            {stats?.stats?.totalGenerated || 0}
                        </div>
                        {stats?.rpProfile?.maxTickets && (
                            <div className="text-xs text-gray-500 mt-1">
                                de {stats.rpProfile.maxTickets} máximo
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="text-sm text-gray-600 mb-1">Tickets Usados</div>
                        <div className="text-3xl font-bold text-green-600">
                            {stats?.stats?.totalUsed || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="text-sm text-gray-600 mb-1">Tickets Válidos</div>
                        <div className="text-3xl font-bold text-blue-600">
                            {stats?.stats?.totalValid || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="text-sm text-gray-600 mb-1">Conversión</div>
                        <div className="text-3xl font-bold text-purple-600">
                            {stats?.stats?.conversionRate?.toFixed(1) || 0}%
                        </div>
                    </div>
                </div>

                {/* Breakdown por Guest Type */}
                {stats?.byGuestType && stats.byGuestType.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Por Tipo de Invitado
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {stats.byGuestType.map((type: any) => (
                                <div
                                    key={type.name}
                                    className="border border-gray-200 rounded-lg p-4"
                                >
                                    <div
                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium mb-3"
                                        style={{ backgroundColor: type.color || '#6366F1' }}
                                    >
                                        {type.icon} {type.name}
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Generados:</span>
                                            <span className="font-semibold">{type.generated}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Usados:</span>
                                            <span className="font-semibold text-green-600">{type.used}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Válidos:</span>
                                            <span className="font-semibold text-blue-600">{type.valid}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Mis Tickets</h3>
                    <Button onClick={() => setShowGenerateModal(true)}>
                        + Generar Ticket
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-4">
                    {['ALL', 'VALID', 'USED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {status === 'ALL' ? 'Todos' : status === 'VALID' ? 'Válidos' : 'Usados'}
                        </button>
                    ))}
                </div>

                {/* Tickets Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No hay tickets {filter !== 'ALL' ? filter.toLowerCase() : 'generados'}
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Apodo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Usado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Generado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTickets.map((ticket: any) => (
                                    <tr key={ticket.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {ticket.guestType && (
                                                <div
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-white text-xs font-medium"
                                                    style={{ backgroundColor: ticket.guestType.color || '#6366F1' }}
                                                >
                                                    {ticket.guestType.icon} {ticket.guestType.name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {ticket.guestNickname || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${ticket.status === 'USED'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                    }`}
                                            >
                                                {ticket.status === 'USED' ? 'Usado' : 'Válido'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {ticket.usedAt
                                                ? new Date(ticket.usedAt).toLocaleDateString('es-MX')
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(ticket.createdAt).toLocaleDateString('es-MX')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Generate Modal */}
            <GenerateTicketModal
                isOpen={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                onSuccess={loadData}
            />
        </div>
    );
}
