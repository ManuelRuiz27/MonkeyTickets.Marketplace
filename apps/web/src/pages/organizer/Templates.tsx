import { useEffect, useState } from 'react';
import { apiClient, OrganizerTemplateInput } from '../../api/client';
import { components as ApiComponents } from '@monomarket/contracts';
import { Modal } from '../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';

type ApiTemplate = ApiComponents['schemas']['TicketTemplate'];
type ApiEvent = ApiComponents['schemas']['Event'];

const defaultTemplateForm: OrganizerTemplateInput = {
    name: '',
    description: '',
    price: 0,
    currency: 'MXN',
    quantity: 0,
};

export function OrganizerTemplatesPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<ApiTemplate[]>([]);
    const [events, setEvents] = useState<ApiEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(defaultTemplateForm);
    const [file, setFile] = useState<File | null>(null);
    const [uploadEventId, setUploadEventId] = useState('');
    const [qrConfig, setQrConfig] = useState({
        qrCodeX: 400,
        qrCodeY: 100,
        qrCodeWidth: 150,
    });
    const [assignModal, setAssignModal] = useState<{ open: boolean; template?: ApiTemplate }>({ open: false });
    const [assignEventId, setAssignEventId] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesData, eventsData] = await Promise.all([
                apiClient.getOrganizerTemplates(),
                apiClient.getOrganizerEvents(),
            ]);
            setTemplates(templatesData || []);
            setEvents(eventsData || []);
        } catch (err: any) {
            setError(err.message || 'Error al cargar plantillas');
        } finally {
            setLoading(false);
        }
    };

    const createTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError('');
            await apiClient.createOrganizerTemplate({
                ...form,
                price: Number(form.price) || 0,
                quantity: Number(form.quantity) || 0,
            });
            setForm(defaultTemplateForm);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Error al crear plantilla');
        }
    };

    const deleteTemplate = async (id?: string) => {
        if (!id) return;
        const confirmed = window.confirm('A�Eliminar esta plantilla?');
        if (!confirmed) return;

        try {
            await apiClient.deleteOrganizerTemplate(id);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'No se pudo eliminar la plantilla');
        }
    };

    const uploadTemplateFile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadEventId || !file) {
            setError('Selecciona un evento y un archivo para subir');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('qrCodeX', qrConfig.qrCodeX.toString());
            formData.append('qrCodeY', qrConfig.qrCodeY.toString());
            formData.append('qrCodeWidth', qrConfig.qrCodeWidth.toString());

            await apiClient.uploadPdfTemplate(uploadEventId, formData);
            setFile(null);
            setUploadEventId('');
            setError('');
            alert('Plantilla PDF actualizada.');
        } catch (err: any) {
            setError(err.message || 'Error al subir la plantilla');
        }
    };

    const confirmAssignTemplate = async () => {
        if (!assignModal.template?.id || !assignEventId) {
            return;
        }
        try {
            await apiClient.assignTemplateToEvent(assignEventId, assignModal.template.id);
            setAssignModal({ open: false });
            setAssignEventId('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'No se pudo asignar la plantilla');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500 uppercase">Gestor de plantillas</p>
                        <h1 className="text-2xl font-bold text-gray-900">Plantillas de boletos</h1>
                    </div>
                    <button
                        onClick={() => navigate('/organizer/events')}
                        className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                    >
                        Volver a eventos
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                <section className="bg-white rounded-2xl shadow p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Mis plantillas</h2>
                            <p className="text-sm text-gray-500">Asigna plantillas a tus eventos o elimina las que no necesites.</p>
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-center text-gray-500 py-6">Cargando plantillas...</p>
                    ) : templates.length === 0 ? (
                        <p className="text-center text-gray-500 py-6">A�n no tienes plantillas guardadas.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map((template) => (
                                <div key={template.id} className="border rounded-xl p-4 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">{template.name}</p>
                                            <p className="text-sm text-gray-500">{template.description || 'Sin descripciA3n'}</p>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">
                                            ${Number(template.price || 0).toLocaleString('es-MX')} {template.currency || 'MXN'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">Disponible: {template.quantity}</p>
                                    <p className="text-sm text-gray-500">
                                        Evento asignado: {template.eventId ? events.find((e) => e.id === template.eventId)?.title || template.eventId : 'Ninguno'}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setAssignModal({ open: true, template });
                                                setAssignEventId(template.eventId || '');
                                            }}
                                            className="flex-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-100"
                                        >
                                            Asignar evento
                                        </button>
                                        <button
                                            onClick={() => deleteTemplate(template.id)}
                                            className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear nueva plantilla</h2>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={createTemplate}>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                            <label className="text-sm font-medium text-gray-700">Precio</label>
                            <input
                                type="number"
                                min={0}
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Cantidad disponible</label>
                            <input
                                type="number"
                                min={0}
                                value={form.quantity}
                                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
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
                            <label className="text-sm font-medium text-gray-700">Evento (opcional)</label>
                            <select
                                value={form.eventId || ''}
                                onChange={(e) => setForm({ ...form, eventId: e.target.value || undefined })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            >
                                <option value="">Sin asignar</option>
                                {events.map((event) => (
                                    <option key={event.id} value={event.id}>{event.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                            >
                                Guardar plantilla
                            </button>
                        </div>
                    </form>
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Subir diseA�o y coordenadas QR</h2>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={uploadTemplateFile}>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Evento</label>
                            <select
                                required
                                value={uploadEventId}
                                onChange={(e) => setUploadEventId(e.target.value)}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            >
                                <option value="">Selecciona un evento</option>
                                {events.map((event) => (
                                    <option key={event.id} value={event.id}>{event.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Archivo PDF/JPG/PNG</label>
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="mt-1 w-full rounded-lg border px-3 py-2 bg-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Coordenada X</label>
                            <input
                                type="number"
                                value={qrConfig.qrCodeX}
                                onChange={(e) => setQrConfig({ ...qrConfig, qrCodeX: Number(e.target.value) })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Coordenada Y</label>
                            <input
                                type="number"
                                value={qrConfig.qrCodeY}
                                onChange={(e) => setQrConfig({ ...qrConfig, qrCodeY: Number(e.target.value) })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">TamaA�o QR</label>
                            <input
                                type="number"
                                value={qrConfig.qrCodeWidth}
                                onChange={(e) => setQrConfig({ ...qrConfig, qrCodeWidth: Number(e.target.value) })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                            >
                                Guardar diseA�o
                            </button>
                        </div>
                    </form>
                </section>
            </main>

            <Modal
                open={assignModal.open}
                title="Asignar plantilla a evento"
                onClose={() => setAssignModal({ open: false })}
                actions={(
                    <>
                        <button
                            onClick={() => setAssignModal({ open: false })}
                            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmAssignTemplate}
                            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                            type="button"
                        >
                            Asignar
                        </button>
                    </>
                )}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Selecciona el evento al que deseas asociar la plantilla <strong>{assignModal.template?.name}</strong>.
                    </p>
                    <select
                        value={assignEventId}
                        onChange={(e) => setAssignEventId(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                    >
                        <option value="">Selecciona un evento</option>
                        {events.map((event) => (
                            <option key={event.id} value={event.id}>{event.title}</option>
                        ))}
                    </select>
                </div>
            </Modal>
        </div>
    );
}
