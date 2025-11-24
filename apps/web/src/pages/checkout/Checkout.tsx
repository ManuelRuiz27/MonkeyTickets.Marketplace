import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

type PaymentProviderOption = 'mercadopago';
type PaymentMethodOption = 'card' | 'google_pay' | 'apple_pay' | 'spei' | 'oxxo';

const PROVIDERS: PaymentProviderOption[] = ['mercadopago'];
const PAYMENT_METHODS: PaymentMethodOption[] = ['card', 'google_pay', 'apple_pay', 'spei', 'oxxo'];
const CARD_BASED_METHODS: PaymentMethodOption[] = ['card', 'google_pay', 'apple_pay'];

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
    const [checkoutSession, setCheckoutSession] = useState<{
        orderId: string;
        total: number;
        currency?: string;
        expiresAt: string;
    } | null>(null);
    const [paymentResult, setPaymentResult] = useState<{
        paymentId: string;
        providerPaymentId: string;
        redirectUrl?: string;
        instructions?: string;
    } | null>(null);
    const [paymentData, setPaymentData] = useState<{
        provider: PaymentProviderOption;
        method: PaymentMethodOption;
        token: string;
        installments: number;
    }>({
        provider: 'mercadopago',
        method: 'card',
        token: '',
        installments: 1,
    });

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

        if (!paymentData.token.trim()) {
            errors.push('Ingresa el token o referencia del pago');
        }

        if (CARD_BASED_METHODS.includes(paymentData.method) && paymentData.installments < 1) {
            errors.push('Selecciona un numero de mensualidades valido');
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
        setCheckoutSession(null);
        setPaymentResult(null);

        try {
            const checkoutData = {
                eventId: eventId!,
                tickets: [
                    {
                        templateId,
                        quantity: Number(quantity),
                    }
                ],
                ...formData
            };
            console.log('Sending checkout data:', checkoutData);
            const sessionResponse = await apiClient.createCheckoutSession(checkoutData);
            setCheckoutSession(sessionResponse);

            const paymentResponse = await apiClient.payOrder({
                orderId: sessionResponse.orderId,
                provider: paymentData.provider,
                method: paymentData.method,
                token: paymentData.token.trim(),
                ...(CARD_BASED_METHODS.includes(paymentData.method) &&
                    paymentData.installments > 0
                    ? { installments: paymentData.installments }
                    : {}),
            });
            setPaymentResult(paymentResponse);
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

    if (success && checkoutSession && paymentResult) {
        const currencyLabel = checkoutSession.currency ?? 'MXN';
        const formattedTotal = checkoutSession.total.toLocaleString('es-MX', {
            style: 'currency',
            currency: currencyLabel,
        });
        const expiresAtLabel = new Date(checkoutSession.expiresAt).toLocaleString();

        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19a7 7 0 100-14 7 7 0 000 14z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Pago iniciado</h2>
                    <p className="text-gray-600 mb-6">
                        Tu orden <strong>{checkoutSession.orderId}</strong> continúa en proceso. Te enviamos los detalles a <strong>{formData.email}</strong>.
                    </p>

                    <div className="bg-gray-50 rounded-xl p-6 text-left space-y-4 mb-8">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total</span>
                            <span className="font-semibold text-gray-900">{formattedTotal}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Expira</span>
                            <span>{expiresAtLabel}</span>
                        </div>
                    </div>

                    <div className="bg-white/60 rounded-xl p-6 text-left space-y-3 mb-6">
                        <p className="text-sm text-gray-500">Proveedor: <span className="font-medium text-gray-900 uppercase">{paymentData.provider}</span></p>
                        <p className="text-sm text-gray-500">Método: <span className="font-medium text-gray-900 uppercase">{paymentData.method}</span></p>
                        <p className="text-sm text-gray-500 break-all">
                            Referencia del pago: <span className="font-mono text-gray-900">{paymentResult.providerPaymentId}</span>
                        </p>
                        {paymentResult.instructions && (
                            <p className="text-sm text-gray-600">{paymentResult.instructions}</p>
                        )}
                        {paymentResult.redirectUrl && (
                            <a
                                href={paymentResult.redirectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-primary-50 text-primary-700 px-4 py-3 rounded-lg font-medium hover:bg-primary-100 transition-colors text-center"
                            >
                                Continuar pago
                            </a>
                        )}
                    </div>

                    <p className="text-sm text-gray-500 mb-6">
                        Completa el pago antes de la hora de expiración para asegurar tus boletos.
                    </p>

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

                            <div className="border-t border-gray-100 pt-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Detalles de Pago</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
                                        <select
                                            value={paymentData.provider}
                                            onChange={(e) => setPaymentData({ ...paymentData, provider: e.target.value as PaymentProviderOption })}
                                            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        >
                                            {PROVIDERS.map((provider) => (
                                                <option key={provider} value={provider}>{provider.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Método</label>
                                        <select
                                            value={paymentData.method}
                                            onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value as PaymentMethodOption })}
                                            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        >
                                            {PAYMENT_METHODS.map((method) => (
                                                <option key={method} value={method}>{method.replace('_', ' ').toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Token o Referencia</label>
                                    <input
                                        type="text"
                                        required
                                        value={paymentData.token}
                                        onChange={(e) => setPaymentData({ ...paymentData, token: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="token_abc123"
                                    />
                                </div>
                                {CARD_BASED_METHODS.includes(paymentData.method) && (
                                    <div className="mb-4">
                                        <label
                                            htmlFor="checkout-installments"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            Mensualidades
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={12}
                                            id="checkout-installments"
                                            aria-label="Mensualidades"
                                            value={paymentData.installments}
                                            onChange={(e) => setPaymentData({ ...paymentData, installments: Number(e.target.value) })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                    </div>
                                )}
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
