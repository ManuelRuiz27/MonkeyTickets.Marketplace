import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { CreateEventForm } from '../../components/organizer/CreateEventForm';
import { apiClient } from '../../api/client';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useToast } from '../../hooks/useToast';

export function EditEventPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (eventId) {
            apiClient.getEventById(eventId)
                .then(setEvent)
                .catch(() => {
                    toast.error('Error al cargar el evento');
                    navigate('/organizer/events');
                })
                .finally(() => setLoading(false));
        }
    }, [eventId, navigate, toast]);

    const rawUser = localStorage.getItem('authUser');
    const user = rawUser ? JSON.parse(rawUser) : undefined;

    return (
        <DashboardLayout type="organizer" user={user}>
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Editar Evento</h1>
                    <p className="text-gray-500 mt-1">Modifica los detalles de tu evento</p>
                </div>

                {loading ? (
                    <LoadingSkeleton height={400} count={1} />
                ) : event ? (
                    <CreateEventForm
                        initialData={event}
                        isEditMode={true}
                        onSuccess={() => {
                            toast.success('✅ Evento actualizado correctamente');
                            navigate('/organizer/events');
                        }}
                        onCancel={() => navigate('/organizer/events')}
                    />
                ) : (
                    <div className="text-center text-gray-500 py-12">
                        Evento no encontrado
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
