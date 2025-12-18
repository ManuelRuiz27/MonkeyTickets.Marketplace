import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '../ui/Button';
import { CreateRPModal } from './CreateRPModal';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';

interface RPManagementProps {
    eventId: string;
}

export function RPManagement({ eventId }: RPManagementProps) {
    const toast = useToast();
    const navigate = useNavigate();
    const [rps, setRps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadRPs();
    }, [eventId]);

    const loadRPs = async () => {
        try {
            setLoading(true);
            const data = await apiClient.listRPUsers(eventId);
            setRps(data);
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar RPs');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (rpProfileId: string, currentStatus: boolean) => {
        try {
            await apiClient.toggleRPUser(rpProfileId);
            toast.success(currentStatus ? 'RP desactivado' : 'RP activado');
            loadRPs();
        } catch (error: any) {
            toast.error(error.message || 'Error al actualizar RP');
        }
    };

    const handleResetPassword = async (rpProfileId: string, name: string) => {
        if (!confirm(`¿Resetear contraseña de ${name}?`)) {
            return;
        }

        try {
            const result = await apiClient.resetRPPassword(rpProfileId);
            toast.success(`✅ Nueva contraseña: ${result.temporaryPassword}`);
        } catch (error: any) {
            toast.error(error.message || 'Error al resetear contraseña');
        }
    };

    if (loading) {
        return <div className="text-center py-8">Cargando...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Relaciones Públicas (RPs)</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Gestiona los promotores de tu evento
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    + Agregar RP
                </Button>
            </div>

            {/* Dashboard Link */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-blue-900">Dashboard de RPs</h3>
                        <p className="text-sm text-blue-700">
                            Ver métricas, rankings y desempeño de cada RP
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/organizer/events/${eventId}/rp-dashboard`)}
                    >
                        Ver Dashboard →
                    </Button>
                </div>
            </div>

            {/* Lista de RPs */}
            {rps.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-gray-500 mb-4">No hay RPs registrados aún</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        + Crear Primer RP
                    </Button>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    RP
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Generados
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Usados
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Conversión
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rps.map((item) => (
                                <tr key={item.rpProfile.id} className={!item.rpProfile.isActive ? 'opacity-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="font-medium text-gray-900">{item.user.name}</div>
                                            <div className="text-sm text-gray-500">{item.user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.rpProfile.ticketsGenerated}
                                        {item.rpProfile.maxTickets && (
                                            <span className="text-gray-500"> / {item.rpProfile.maxTickets}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                        {item.rpProfile.ticketsUsed}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">
                                            {item.rpProfile.conversionRate.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${item.rpProfile.isActive
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {item.rpProfile.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleToggleActive(item.rpProfile.id, item.rpProfile.isActive)}
                                            className="text-yellow-600 hover:text-yellow-900"
                                        >
                                            {item.rpProfile.isActive ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button
                                            onClick={() => handleResetPassword(item.rpProfile.id, item.user.name)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Reset Password
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de creación */}
            <CreateRPModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                eventId={eventId}
                onSuccess={loadRPs}
            />
        </div>
    );
}
