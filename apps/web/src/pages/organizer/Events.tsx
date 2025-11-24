import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient, OrganizerEventInput } from '../../api/client';
import { components as ApiComponents } from '@monomarket/contracts';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

type ApiEvent = ApiComponents['schemas']['Event'];

const initialEventForm: OrganizerEventInput = {
    title: '',
    description: '',
    category: '',
    venue: '',
    address: '',
    city: '',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date().toISOString().slice(0, 16),
    coverImage: '',
    status: 'draft',
    capacity: 0,
    price: 0,
    currency: 'MXN',
    isPublic: true,
};

export function OrganizerEventsPage() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [events, setEvents] = useState<ApiEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [form, setForm] = useState<OrganizerEventInput>(initialEventForm);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await apiClient.getOrganizerEvents();
            setEvents(response ?? []);
        } catch (err: any) {
            setError(err.message || 'No se pudieron cargar los eventos.');
        } finally {
            setLoading(false);
        }
    };

    const createEvent = async (e?: React.BaseSyntheticEvent) => {
        e?.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await apiClient.createOrganizerEvent({
                ...form,
                startDate: new Date(form.startDate || '').toISOString(),
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                capacity: Number(form.capacity) || 0,
                price: Number(form.price) || 0,
            });
            setShowCreateModal(false);
            setForm(initialEventForm);
            await loadEvents();
        } catch (err: any) {
            setError(err.message || 'No se pudo crear el evento.');
        } finally {
            setSubmitting(false);
        }
    };

    const cancelEvent = async (eventId: string | undefined) => {
        if (!eventId) return;
        const confirmed = window.confirm('A�Seguro que deseas cancelar este evento?');
        if (!confirmed) return;

        try {
            await apiClient.deleteOrganizerEvent(eventId);
            await loadEvents();
        } catch (err: any) {
            setError(err.message || 'No se pudo cancelar el evento.');
        }
    };

    const totalRevenue = useMemo(() => {
        return events.reduce((sum, event) => {
            const ticketPrice = Number((event as any)?.price ?? 0);
            const sold = ((event as any)?.templates || []).reduce(
                (acc: number, template: any) => acc + (template.sold || 0) * Number(template.price || 0),
                0,
            );
            return sum + (ticketPrice > 0 ? ticketPrice : 0) + sold;
        }, 0);
    }, [events]);

    const totalTickets = useMemo(() => {
        return events.reduce((acc, event) => {
            const templates = ((event as any)?.templates || []) as any[];
            return acc + templates.reduce((tempAcc, template) => tempAcc + (template.sold || 0), 0);
        }, 0);
    }, [events]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500 uppercase">Panel de Organizador</p>
                        <h1 className="text-3xl font-bold text-gray-900">Tus eventos</h1>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/organizer/templates"
                            className="px-4 py-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50"
                        >
                            Plantillas
                        </Link>
                        <button
                            onClick={() => {
                                logout();
                                navigate('/organizer/login');
                            }}
                            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                        >
                            Cerrar sesiA3n
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                        >
                            Nuevo evento
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-8">
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow p-6">
                        <p className="text-sm text-gray-500">Eventos activos</p>
                        <p className="text-4xl font-bold text-primary-600 mt-2">{events.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow p-6">
                        <p className="text-sm text-gray-500">Boletos vendidos</p>
                        <p className="text-4xl font-bold text-green-600 mt-2">{totalTickets}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow p-6">
                        <p className="text-sm text-gray-500">Ingresos estimados</p>
                        <p className="text-4xl font-bold text-blue-600 mt-2">
                            ${totalRevenue.toLocaleString('es-MX')} MXN
                        </p>
                    </div>
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Listado de eventos</h2>
                            <p className="text-sm text-gray-500">
                                Gestiona tus eventos publicados y en borrador. Usuario: {user?.email}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Cargando eventos...</div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No tienes eventos registrados. Crea tu primer evento para comenzar a vender.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Evento</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fechas</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">UbicaciA3n</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {events.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <p className="font-medium text-gray-900">{event.title}</p>
                                                <p className="text-sm text-gray-500">{event.category || 'Sin categorA-a'}</p>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                <p>{event.startDate ? new Date(event.startDate).toLocaleString() : 'Sin fecha'}</p>
                                                {event.endDate && (
                                                    <p className="text-gray-500">Fin: {new Date(event.endDate).toLocaleString()}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                <p>{event.venue || 'Por definir'}</p>
                                                <p className="text-gray-500">{event.city}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                {(() => {
                                                    const normalizedStatus = (event.status || 'draft').toString().toUpperCase();
                                                    const badgeClass =
                                                        normalizedStatus === 'PUBLISHED'
                                                            ? 'bg-green-100 text-green-700'
                                                            : normalizedStatus === 'DRAFT'
                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                : 'bg-red-100 text-red-700';
                                                    return (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                                                            {normalizedStatus}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-2 text-sm">
                                                    <button
                                                        onClick={() => navigate(`/organizer/events/${event.id}/sales`)}
                                                        className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-100"
                                                    >
                                                        Ver ventas
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/organizer/events/${event.id}/pdf-template`)}
                                                        className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-100"
                                                    >
                                                        Plantilla
                                                    </button>
                                                    <button
                                                        onClick={() => cancelEvent(event.id)}
                                                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>

            <Modal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Crear nuevo evento"
                actions={(
                    <>
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => createEvent()}
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                            type="button"
                        >
                            {submitting ? 'Guardando...' : 'Crear'}
                        </button>
                    </>
                )}
            >
                <form
                    onSubmit={createEvent}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Nombre del evento</label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">DescripciA3n</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Fecha de inicio</label>
                        <input
                            type="datetime-local"
                            required
                            value={form.startDate}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Fecha de fin</label>
                        <input
                            type="datetime-local"
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Venue</label>
                        <input
                            type="text"
                            value={form.venue}
                            onChange={(e) => setForm({ ...form, venue: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Ciudad</label>
                        <input
                            type="text"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Capacidad</label>
                        <input
                            type="number"
                            min={0}
                            value={form.capacity}
                            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Precio base (MXN)</label>
                        <input
                            type="number"
                            min={0}
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Moneda</label>
                        <input
                            type="text"
                            value={form.currency}
                            onChange={(e) => setForm({ ...form, currency: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Estado</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as OrganizerEventInput['status'] })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            >
                                <option value="draft">Borrador</option>
                                <option value="published">Publicado</option>
                            </select>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                        <input
                            id="isPublic"
                            type="checkbox"
                            checked={form.isPublic ?? true}
                            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="isPublic" className="text-sm text-gray-700">
                            evento visible en marketplace
                        </label>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
