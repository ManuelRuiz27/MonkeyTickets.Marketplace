import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '../ui/Button';
import { CreateRPModal } from './CreateRPModal';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';

interface RPManagementProps {
    eventId: string;
    eventTitle: string;
}

export function RPManagement({ eventId, eventTitle }: RPManagementProps) {
    const toast = useToast();
    const navigate = useNavigate();
    const [rps, setRps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        loadRPs();
    }, [eventId]);

    const loadRPs = async () => {
        try {
            setLoading(true);
            const data = await apiClient.listRPs(eventId);
            setRps(data);
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar RPs');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = (shareLink: string, code: string) => {
        navigator.clipboard.writeText(shareLink);
        setCopiedCode(code);
        toast.success('Link copiado al portapapeles');
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleToggleActive = async (rpId: string, currentStatus: boolean) => {
        try {
            await apiClient.updateRP(rpId, { isActive: !currentStatus });
            toast.success(currentStatus ? 'RP desactivado' : 'RP activado');
            loadRPs();
        } catch (error: any) {
            toast.error(error.message || 'Error al actualizar RP');
        }
    };

    const handleDelete = async (rpId: string, name: string) => {
        if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await apiClient.deleteRP(rpId);
            toast.success('RP eliminado correctamente');
            loadRPs();
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar RP');
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
                                    Código
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Generados
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Asistencia
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
                            {rps.map((rp) => (
                                <tr key={rp.id} className={!rp.isActive ? 'opacity-50' : ''}>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {rp.ticketsGenerated}
                                        {rp.maxTickets && (
                                            <span className="text-gray-500"> / {rp.maxTickets}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                        {rp.ticketsUsed}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">
                                            {rp.conversionRate.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${rp.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {rp.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleCopyLink(rp.shareLink, rp.code)}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="Copiar link compartible"
                                        >
                                            {copiedCode === rp.code ? '✓ Copiado' : '🔗 Copiar'}
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(rp.id, rp.isActive)}
                                            className="text-yellow-600 hover:text-yellow-900"
                                        >
                                            {rp.isActive ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rp.id, rp.name)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Eliminar
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
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                eventId={eventId}
                onSuccess={loadRPs}
            />
        </div>
    );
}
