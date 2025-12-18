import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '../ui/Button';
import { CreateGuestTypeModal } from './CreateGuestTypeModal';
import { useToast } from '../../hooks/useToast';

interface GuestTypesManagerProps {
    eventId: string;
}

export function GuestTypesManager({ eventId }: GuestTypesManagerProps) {
    const toast = useToast();
    const [guestTypes, setGuestTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadGuestTypes();
    }, [eventId]);

    const loadGuestTypes = async () => {
        try {
            setLoading(true);
            const data = await apiClient.listGuestTypes(eventId);
            setGuestTypes(data);
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar tipos de invitado');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (guestTypeId: string, name: string, ticketCount: number) => {
        if (ticketCount > 0) {
            toast.error(`⚠️ No se puede eliminar "${name}" porque tiene ${ticketCount} tickets asignados`);
            return;
        }

        if (!confirm(`¿Eliminar tipo "${name}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await apiClient.deleteGuestType(guestTypeId);
            toast.success('Tipo eliminado correctamente');
            loadGuestTypes();
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar tipo');
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
                    <h2 className="text-2xl font-bold text-gray-900">Tipos de Invitados</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Define categorías para tickets generados por RPs
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    + Crear Tipo
                </Button>
            </div>

            {/* Lista de tipos */}
            {guestTypes.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-gray-500 mb-4">No hay tipos de invitado configurados</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        + Crear Primer Tipo
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {guestTypes.map((type) => (
                        <div
                            key={type.id}
                            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                            {/* Badge con color e icono */}
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white font-medium mb-3"
                                style={{ backgroundColor: type.color || '#6366F1' }}
                            >
                                <span>{type.icon || '🎟️'}</span>
                                <span>{type.name}</span>
                            </div>

                            {/* Descripción */}
                            {type.description && (
                                <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                <span>{type.ticketCount} tickets</span>
                                {type.showNicknameOnPdf && (
                                    <span className="text-blue-600">📄 PDF nickname</span>
                                )}
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDelete(type.id, type.name, type.ticketCount)}
                                    className="text-sm text-red-600 hover:text-red-800"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de creación */}
            <CreateGuestTypeModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                eventId={eventId}
                onSuccess={loadGuestTypes}
            />
        </div>
    );
}
