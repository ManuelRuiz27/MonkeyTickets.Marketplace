import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export function Checkout() {
    const { eventId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { templateId, quantity, eventTitle, templateName, price } = location.state || {};

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [tickets, setTickets] = useState<any[]>([]);

    if (!location.state) {
        return <div className="p-8 text-center">No hay información de compra. Vuelve al evento.</div>;
    }

    const total = Number(price) * quantity;

    const validateForm = () => {
        const errors: string[] = [];

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            errors.push('Por favor ingresa un correo electrónico válido');
        }

        // Phone validation (10 digits)
        const phoneRegex = /^\d{10}$/;
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            errors.push('El teléfono debe tener 10 dígitos');
        }

        // Name validation
        if (formData.name.trim().length < 3) {
            errors.push('El nombre es muy corto');
        }

        if (errors.length > 0) {
            setError(errors.join('. '));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            const checkoutData = {
                eventId: eventId!,
                templateId,
                quantity,
                ...formData
            };
            console.log('Sending checkout data:', checkoutData);
            const response: any = await apiClient.checkout(checkoutData);
            setTickets(response.tickets || []);
            setSuccess(true);
        } catch (err: any) {
            console.error('Checkout error:', err);
            // Mejor manejo de errores del backend
            const message = err.message || 'Error al procesar la compra. Intenta nuevamente.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Compra Exitosa!</h2>
                    <p className="text-gray-600 mb-6">
                        Tus tickets han sido enviados a <strong>{formData.email}</strong>.
                    </p>

                    {tickets.length > 0 && (
                        <div className="mb-8 space-y-3">
                            <h3 className="font-semibold text-gray-800">Descarga tus boletos:</h3>
                            {tickets.map((ticket, index) => (
                                <a
                                    key={ticket.id}
                                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/tickets/${ticket.id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Descargar Boleto #{index + 1}
                                </a>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8 text-gray-900">Finalizar Compra</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Formulario */}
                    <div className="bg-white p-8 rounded-xl shadow-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Tus Datos
                        </h2>

                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="juan@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="+52 55 1234 5678"
                                />
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Procesando...
                                        </>
                                    ) : 'Pagar Ahora'}
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-4">
                                    Pagos procesados de forma segura con encriptación SSL de 256-bits.
                                </p>
                            </div>
                        </form>
                    </div>

                    {/* Resumen */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold mb-6 text-gray-900">Resumen de Compra</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Evento</p>
                                    <p className="font-semibold text-gray-900">{eventTitle}</p>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-600">{templateName} x {quantity}</span>
                                        <span className="font-medium">${total.toLocaleString()} MXN</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                                        <span>Cargos por servicio</span>
                                        <span>$0.00 MXN</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-center">
                                        <span className="font-bold text-xl text-gray-900">Total</span>
                                        <span className="font-bold text-2xl text-primary-600">${total.toLocaleString()} MXN</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                            <div className="flex gap-3">
                                <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-blue-800">
                                    Al completar la compra, recibirás tus boletos digitales inmediatamente en tu correo electrónico.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
