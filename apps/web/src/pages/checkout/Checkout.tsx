import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import PaymentMethods, { PAYMENT_METHODS } from '../../components/checkout/PaymentMethods';
import CountdownTimer from '../../components/checkout/CountdownTimer';
import { apiClient } from '../../api/client';
import { OpenpayCardForm } from '../../features/checkout/components/OpenpayCardForm';
import { MercadoPagoButton } from '../../features/payments/components/MercadoPagoButton';
import { SpeiPaymentButton } from '../../features/payments/components/SpeiPaymentButton';
import { OxxoPaymentButton } from '../../features/payments/components/OxxoPaymentButton';

// Diccionario de errores amigables
const ERROR_MESSAGES: Record<string, string> = {
    // OpenPay errors
    'insufficient_funds': '💳 Fondos insuficientes en tu tarjeta',
    'card_declined': '❌ Tu banco rechazó la tarjeta. Intenta con otra',
    'invalid_card': '⚠️ Número de tarjeta inválido',
    'expired_card': '📅 Tarjeta vencida',
    'security_code_invalid': '🔒 Código de seguridad incorrecto',
    'processing_error': '⚙️ Error al procesar el pago. Intenta de nuevo',

    // Generic
    'network_error': '📡 Error de conexión. Verifica tu internet',
    'session_expired': '⏱️ Tu sesión expiró. Recarga la página',
    'default': '⚠️ Ocurrió un error. Por favor intenta de nuevo'
};

const getErrorMessage = (errorCode: string): string => {
    return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;
};

export function Checkout() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { templateId, quantity = 1, eventTitle, templateName, price, eventDate, eventVenue } = location.state || {};

    const [checkoutSession, setCheckoutSession] = useState<any>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(PAYMENT_METHODS[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { register, handleSubmit, formState: { errors }, getValues } = useForm();

    useEffect(() => {
        if (!location.state) {
            // Redirect if no state (direct access)
            // navigate('/'); // Commented out for dev
        }
    }, [location, navigate]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            const session = await apiClient.createCheckoutSession({
                eventId: eventId!,
                tickets: [{ templateId, quantity: Number(quantity) }],
                name: `${data.firstName} ${data.lastName}`,
                email: data.email,
                phone: data.phone,
            });
            setCheckoutSession(session);
        } catch (err: any) {
            setError(err.message || 'Error al iniciar checkout');
        } finally {
            setLoading(false);
        }
    };

    const handleTimeout = () => {
        alert('El tiempo de reserva ha expirado');
        navigate(`/events/${eventId}`);
    };

    const handleChargeSuccess = (_charge: any) => {
        navigate(`/checkout/success?orderId=${checkoutSession.orderId}&status=completed`);
    };

    const handleChargeError = (errorCode: string, fallbackMsg?: string) => {
        const friendlyMessage = getErrorMessage(errorCode);
        setError(fallbackMsg || friendlyMessage);
    };

    // Mock event object for summary
    const eventSummary = {
        title: eventTitle || 'Evento',
        date: eventDate ? new Date(eventDate) : new Date(),
        venue: eventVenue || 'Lugar por confirmar',
    };

    const ticketsSummary = [{
        name: templateName || 'Boleto',
        price: Number(price) || 0,
        quantity: Number(quantity) || 1
    }];

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">

                    {/* Checkout Form */}
                    <div className="lg:col-span-7">
                        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                            <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Finalizar Compra</h1>
                                    <p className="mt-2 text-sm text-gray-500">
                                        Completa tus datos para recibir tus boletos.
                                    </p>
                                </div>
                                <div className="mt-4 flex space-x-3 md:mt-0">
                                    <CountdownTimer initialTime={300} onTimeout={handleTimeout} />
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-md">
                                    {error}
                                </div>
                            )}

                            {!checkoutSession ? (
                                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">
                                            Nombre
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                id="first-name"
                                                {...register('firstName', { required: true })}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            />
                                            {errors.firstName && <span className="text-red-500 text-xs">Requerido</span>}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">
                                            Apellidos
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                id="last-name"
                                                {...register('lastName', { required: true })}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            />
                                            {errors.lastName && <span className="text-red-500 text-xs">Requerido</span>}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                id="email"
                                                type="email"
                                                {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            />
                                            {errors.email && <span className="text-red-500 text-xs">Email inválido</span>}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                            Teléfono
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="tel"
                                                id="phone"
                                                placeholder="5512345678"
                                                {...register('phone', {
                                                    required: 'Teléfono requerido',
                                                    pattern: {
                                                        value: /^\d{10}$/,
                                                        message: 'Debe ser un teléfono de 10 dígitos'
                                                    }
                                                })}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            />
                                            {errors.phone && <span className="text-red-500 text-xs">{(errors.phone as any).message}</span>}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-6 pt-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                        >
                                            {loading ? 'Procesando...' : 'Continuar al Pago'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Selecciona tu método de pago</h3>
                                    <PaymentMethods selected={selectedPaymentMethod} onChange={setSelectedPaymentMethod} />

                                    <div className="mt-6 p-4 border rounded-md bg-gray-50">
                                        {selectedPaymentMethod.id === 'card' && (
                                            <OpenpayCardForm
                                                amount={checkoutSession.total}
                                                currency="MXN"
                                                description={`Orden ${checkoutSession.orderId}`}
                                                orderId={checkoutSession.orderId}
                                                customer={{
                                                    name: getValues('firstName'),
                                                    lastName: getValues('lastName'),
                                                    email: getValues('email'),
                                                    phone: getValues('phone'),
                                                }}
                                                onSuccess={handleChargeSuccess}
                                                onError={handleChargeError}
                                            />
                                        )}

                                        {selectedPaymentMethod.id === 'mercadopago' && (
                                            <MercadoPagoButton
                                                orderId={checkoutSession.orderId}
                                                title={`Orden ${checkoutSession.orderId}`}
                                                description={eventTitle}
                                                quantity={Number(quantity)}
                                                unitPrice={Number(price)}
                                                currency="MXN"
                                                payerEmail={getValues('email')}
                                            />
                                        )}

                                        {selectedPaymentMethod.id === 'spei' && (
                                            <SpeiPaymentButton
                                                orderId={checkoutSession.orderId}
                                                amount={checkoutSession.total}
                                                currency="MXN"
                                                description={`Orden ${checkoutSession.orderId} - ${eventTitle}`}
                                                customerName={`${getValues('firstName')} ${getValues('lastName')}`}
                                                customerEmail={getValues('email')}
                                                customerPhone={getValues('phone')}
                                            />
                                        )}

                                        {selectedPaymentMethod.id === 'oxxo' && (
                                            <OxxoPaymentButton
                                                orderId={checkoutSession.orderId}
                                                amount={checkoutSession.total}
                                                currency="MXN"
                                                description={`Orden ${checkoutSession.orderId} - ${eventTitle}`}
                                                customerName={`${getValues('firstName')} ${getValues('lastName')}`}
                                                customerEmail={getValues('email')}
                                                daysToExpire={3}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="mt-10 lg:mt-0 lg:col-span-5">
                        <CheckoutSummary event={eventSummary} tickets={ticketsSummary} />
                    </div>

                </div>
            </div>
        </div>
    );
}
