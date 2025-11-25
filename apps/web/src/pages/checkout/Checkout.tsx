import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { components } from '@monomarket/contracts';
import { apiClient } from '../../api/client';
import { OpenpayCardForm } from '../../features/checkout/components/OpenpayCardForm';
import { MercadoPagoButton } from '../../features/payments/components/MercadoPagoButton';

type CheckoutSession = {
    orderId: string;
    total: number;
    currency?: string;
    expiresAt: string;
};

const CARD_STEP_HINT = 'Completa tus datos para habilitar el pago con tarjeta.';

export function Checkout() {
    const { eventId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { templateId, quantity = 1, eventTitle, templateName, price } = location.state || {};

    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);

    if (!location.state) {
        return <div className="p-8 text-center">No hay información de compra. Vuelve al evento.</div>;
    }

    const quantityNumber = Number(quantity) || 1;
    const baseTotal = Number(price) * quantityNumber;
    const sessionTotal = checkoutSession?.total ?? baseTotal;
    const unitPriceValue = baseTotal / quantityNumber;
    const currencyLabel = checkoutSession?.currency ?? 'MXN';
    const description = [eventTitle, templateName].filter(Boolean).join(' - ') || 'Compra de boletos';

    const { firstName, lastName } = splitName(formData.name);

    const validateForm = () => {
        const messages: string[] = [];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            messages.push('Ingresa un correo válido');
        }

        const phoneRegex = /^\d{10}$/;
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            messages.push('El teléfono debe tener 10 dígitos');
        }

        if (formData.name.trim().length < 3) {
            messages.push('El nombre es muy corto');
        }

        if (messages.length) {
            setError(messages.join('. '));
            return false;
        }

        return true;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!validateForm() || !eventId) return;

        setLoading(true);
        setError('');
        setCheckoutSession(null);

        try {
            const session = await apiClient.createCheckoutSession({
                eventId,
                tickets: [{ templateId, quantity: quantityNumber }],
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
            });
            setCheckoutSession(session);
        } catch (err: any) {
            const message = err?.message || 'No pudimos iniciar el checkout, intenta nuevamente.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleChargeSuccess = (charge: components['schemas']['OpenpayChargeResponse']) => {
        const orderId = checkoutSession?.orderId;
        if (!orderId) return;
        const status = charge.status ?? 'completed';
        navigate(`/checkout/success?orderId=${orderId}&status=${status}`, {
            state: {
                orderId,
                amount: sessionTotal,
                currency: currencyLabel,
                status,
            },
        });
    };

    const handleChargeError = (message: string) => {
        setError(message);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="container mx-auto px-4 max-w-5xl">
                <h1 className="text-3xl font-bold mb-8 text-gray-900">Finalizar compra</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <div className="bg-white p-8 rounded-xl shadow-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                                Datos de contacto
                            </h2>

                            {error && (
                                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm" role="alert">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Juan Perez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
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
                                        onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="5512345678"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {loading ? 'Generando orden…' : 'Continuar con el pago'}
                                </button>
                                <p className="text-center text-xs text-gray-400">{CARD_STEP_HINT}</p>
                            </form>
                        </div>

                        {checkoutSession && (
                            <div className="mt-8 space-y-8">
                                <section className="bg-white p-6 rounded-xl border border-gray-100">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Pagar con tarjeta (Openpay)</h3>
                                    <OpenpayCardForm
                                        amount={sessionTotal}
                                        currency="MXN"
                                        description={description}
                                        orderId={checkoutSession.orderId}
                                        customer={{
                                            name: firstName || formData.name,
                                            lastName: lastName || firstName || formData.name,
                                            email: formData.email,
                                            phone: formData.phone.replace(/\D/g, ''),
                                        }}
                                        onSuccess={handleChargeSuccess}
                                        onError={handleChargeError}
                                    />
                                </section>

                                <section className="bg-white p-6 rounded-xl border border-gray-100">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Pagar con Mercado Pago</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Serás redirigido al checkout seguro de Mercado Pago para completar el pago.
                                    </p>
                                    <MercadoPagoButton
                                        orderId={checkoutSession.orderId}
                                        title={description}
                                        description={eventTitle}
                                        quantity={quantityNumber}
                                        unitPrice={unitPriceValue}
                                        currency="MXN"
                                        payerEmail={formData.email}
                                    />
                                </section>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold mb-6 text-gray-900">Resumen de compra</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Evento</p>
                                    <p className="font-semibold text-gray-900">{eventTitle}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Entradas</p>
                                    <p className="font-semibold text-gray-900">{templateName} x {quantityNumber}</p>
                                </div>
                                {checkoutSession && (
                                    <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm">
                                        Orden generada: <span className="font-mono">{checkoutSession.orderId}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-100 pt-4">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium">
                                            {baseTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                                        <span>Cargos por servicio</span>
                                        <span>$0.00 MXN</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-center">
                                        <span className="font-bold text-xl text-gray-900">Total</span>
                                        <span className="font-bold text-2xl text-primary-600">
                                            {sessionTotal.toLocaleString('es-MX', { style: 'currency', currency: currencyLabel })}
                                        </span>
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
                                    Tus datos se protegen con tokenización segura. Nunca almacenamos la tarjeta en nuestros servidores.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function splitName(value: string) {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return { firstName: '', lastName: '' };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    const [firstName, ...rest] = parts;
    return {
        firstName,
        lastName: rest.join(' '),
    };
}
