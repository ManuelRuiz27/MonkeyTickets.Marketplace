import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

const CATEGORIES = [
    { value: 'MUSIC', label: 'Música' },
    { value: 'SPORTS', label: 'Deportes' },
    { value: 'THEATER', label: 'Teatro' },
    { value: 'COMEDY', label: 'Comedia' },
    { value: 'CONFERENCE', label: 'Conferencias' },
    { value: 'FESTIVAL', label: 'Festivales' },
    { value: 'OTHER', label: 'Otros' },
];

interface CreateEventFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    initialData?: any;
    isEditMode?: boolean;
}

export function CreateEventForm({ onSuccess, onCancel, initialData, isEditMode = false }: CreateEventFormProps) {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(initialData || {
        title: '',
        description: '',
        category: 'MUSIC',
        startDate: '',
        endDate: '',
        venue: '',
        address: '',
        city: '',
        capacity: 100,
        price: 0,
        maxTicketsPerPurchase: 10,
        coverImage: '',
        isPublic: true,
        isUnlisted: false,
        accessToken: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'number' ? Number(value) :
                type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                    value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validations
            if (!formData.title || !formData.startDate) {
                toast.error('Por favor completa los campos obligatorios');
                setLoading(false);
                return;
            }

            if (new Date(formData.startDate) < new Date()) {
                toast.error('La fecha de inicio debe ser futura');
                setLoading(false);
                return;
            }

            if (formData.capacity < 50) {
                toast.error('La capacidad mínima es de 50 boletos');
                setLoading(false);
                return;
            }

            const eventData = {
                ...formData,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : new Date(formData.startDate).toISOString(),
                status: 'DRAFT', // Start as draft
            };

            if (isEditMode && initialData?.id) {
                // Update existing event
                await apiClient.updateOrganizerEvent(initialData.id, eventData);
                toast.success('¡Evento actualizado exitosamente!');
            } else {
                // Create new event
                await apiClient.createOrganizerEvent(eventData);
                toast.success('¡Evento creado exitosamente!');
            }

            if (onSuccess) {
                onSuccess();
            } else {
                navigate('/organizer/events');
            }
        } catch (error: any) {
            console.error('Error creating event:', error);
            toast.error(error.message || 'Error al crear el evento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Editar Evento' : 'Crear Nuevo Evento'}</h2>
                <p className="mt-1 text-sm text-gray-600">
                    {isEditMode ? 'Modifica la información de tu evento' : 'Completa la información de tu evento. Podrás editarla más tarde.'}
                </p>
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título del Evento *
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                        maxLength={200}
                        placeholder="Ej: Concierto Rock en Vivo 2024"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Describe tu evento..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Categoría *
                        </label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL de Imagen
                        </label>
                        <input
                            type="url"
                            name="coverImage"
                            value={formData.coverImage}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="https://ejemplo.com/imagen.jpg"
                        />
                    </div>
                </div>
            </div>

            {/* Date & Venue */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Fecha y Ubicación</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Inicio *
                        </label>
                        <input
                            type="datetime-local"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Fin
                        </label>
                        <input
                            type="datetime-local"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Lugar *
                    </label>
                    <input
                        type="text"
                        name="venue"
                        value={formData.venue}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                        placeholder="Ej: Foro Sol"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dirección
                    </label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Calle y número"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ciudad *
                    </label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                        placeholder="Ej: Ciudad de México"
                    />
                </div>
            </div>

            {/* Capacity & Pricing */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Capacidad y Precios</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Capacidad Total *
                        </label>
                        <input
                            type="number"
                            name="capacity"
                            value={formData.capacity}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                            min="50"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Mínimo 50 boletos por evento
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio Base ($)
                        </label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Máx. Tickets/Compra
                        </label>
                        <input
                            type="number"
                            name="maxTicketsPerPurchase"
                            value={formData.maxTicketsPerPurchase}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            min="1"
                            max="50"
                        />
                    </div>
                </div>
            </div>

            {/* Visibility */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Visibilidad</h3>

                <div className="space-y-3">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="isPublic"
                            checked={formData.isPublic}
                            onChange={handleChange}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            Evento público (visible en marketplace)
                        </span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="isUnlisted"
                            checked={formData.isUnlisted}
                            onChange={handleChange}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            Evento privado (solo accesible con token)
                        </span>
                    </label>

                    {formData.isUnlisted && (
                        <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Token de Acceso
                            </label>
                            <input
                                type="text"
                                name="accessToken"
                                value={formData.accessToken}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="mi-evento-2024"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Los invitados usarán este token para acceder al evento
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
                {onCancel && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                )}
                <Button
                    type="submit"
                    variant="primary"
                    isLoading={loading}
                    disabled={loading}
                >
                    {isEditMode ? 'Guardar Cambios' : 'Crear Evento'}
                </Button>
            </div>
        </form>
    );
}
