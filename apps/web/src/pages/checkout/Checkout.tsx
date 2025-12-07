import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import PaymentMethods, {
    PAYMENT_METHODS,
    PaymentGateway,
    PaymentMethod,
} from '../../components/checkout/PaymentMethods';
import CountdownTimer from '../../components/checkout/CountdownTimer';
import { apiClient, CheckoutOrderSummary } from '../../api/client';
import { MercadoPagoButton } from '../../features/payments/components/MercadoPagoButton';
import { MercadoPagoCard } from '../../components/payments/MercadoPagoCard';
import { SpeiPaymentButton } from '../../features/payments/components/SpeiPaymentButton';
import { OxxoPaymentButton } from '../../features/payments/components/OxxoPaymentButton';
import { OpenpayCardPayment } from '../../features/payments/components/OpenpayCardPayment';

export function Checkout() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { templateId, quantity = 1, eventTitle, templateName, price, eventDate, eventVenue } =
        location.state || {};

    const [checkoutSession, setCheckoutSession] = useState<any>(null);
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('mercadopago');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
        PAYMENT_METHODS[0],
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [orderSummary, setOrderSummary] = useState<CheckoutOrderSummary | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    const isRecaptchaEnabled = Boolean(recaptchaSiteKey);

    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues,
    } = useForm();

    useEffect(() => {
        if (!location.state) {
            // navigate('/');
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
                captchaToken: isRecaptchaEnabled ? captchaToken || undefined : undefined,
            });
            setCheckoutSession(session);
            const summary = await apiClient.getCheckoutOrder(session.orderId);
            setOrderSummary(summary);
        } catch (err: any) {
            const rawMessage = (err?.message as string | undefined)?.toLowerCase();
            let friendly = 'No pudimos iniciar tu checkout. Intenta nuevamente en unos minutos.';
            if (rawMessage?.includes('network')) {
                friendly = 'Hay un problema de conexión. Revisa tu internet e inténtalo de nuevo.';
            } else if (rawMessage?.includes('order already paid')) {
                friendly =
                    'Esta orden ya fue pagada. Revisa tu correo para encontrar tus boletos.';
            }
            setError(friendly);
        } finally {
            setLoading(false);
        }
    };

    const handleTimeout = () => {
        alert('El tiempo de reserva ha expirado');
        navigate(`/events/${eventId}`);
    };

    const eventSummary = {
        title: eventTitle || 'Evento',
        date: eventDate ? new Date(eventDate) : new Date(),
        venue: eventVenue || 'Lugar por confirmar',
    };

    const ticketsSummary = useMemo(
        () => [
            {
                name: templateName || 'Boleto',
                price: Number(price) || 0,
                quantity: Number(quantity) || 1,
            },
        ],
        [templateName, price, quantity],
    );

    const formValues = getValues();
    const payerData = {
        firstName: formValues?.firstName,
        lastName: formValues?.lastName,
        email: formValues?.email,
        phone: formValues?.phone,
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
                    {/* Checkout Form */}
                    <div className="lg:col-span-7">
                        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                            <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Finalizar compra</h1>
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
                                <form
                                    onSubmit={handleSubmit(onSubmit)}
                                    className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6"
                                >
                                    <div className="sm:col-span-3">
                                        <label
                                            htmlFor="first-name"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Nombre
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                id="first-name"
                                                {...register('firstName', { required: true })}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            />
                                            {errors.firstName && (
                                                <span className="text-red-500 text-xs">Requerido</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label
                                            htmlFor="last-name"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Apellidos
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                id="last-name"
                                                {...register('lastName', { required: true })}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            />
                                            {errors.lastName && (
                                                <span className="text-red-500 text-xs">Requerido</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label
                                            htmlFor="email"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Email
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                id="email"
                                                type="email"
                                                {...register('email', {
                                                    required: true,
                                                    pattern: /^\S+@\S+$/i,
                                                })}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            />
                                            {errors.email && (
                                                <span className="text-red-500 text-xs">Email inválido</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label
                                            htmlFor="phone"
                                            className="block text-sm font-medium text-gray-700"
                                        >
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
                                                        message: 'Debe ser un teléfono de 10 dígitos',
                                                    },
                                                })}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            />
                                            {errors.phone && (
                                                <span className="text-red-500 text-xs">
                                                    {(errors.phone as any).message}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isRecaptchaEnabled && (
                                        <div className="sm:col-span-6">
                                            <ReCAPTCHA
                                                sitekey={recaptchaSiteKey!}
                                                onChange={(token: string | null) =>
                                                    setCaptchaToken(token)
                                                }
                                            />
                                        </div>
                                    )}

                                    <div className="sm:col-span-6 pt-4">
                                        <button
                                            type="submit"
                                            disabled={loading || (isRecaptchaEnabled && !captchaToken)}
                                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                        >
                                            {loading ? 'Procesando...' : 'Continuar al pago'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                                        Selecciona tu método de pago
                                    </h3>
                                    <PaymentMethods
                                        gateway={selectedGateway}
                                        method={selectedPaymentMethod}
                                        onGatewayChange={(gateway) => {
                                            setSelectedGateway(gateway);
                                            const firstForGateway = PAYMENT_METHODS.find(
                                                (m) => m.gateway === gateway,
                                            );
                                            if (firstForGateway) {
                                                setSelectedPaymentMethod(firstForGateway);
                                            }
                                        }}
                                        onMethodChange={setSelectedPaymentMethod}
                                    />

                                    <div className="mt-6 p-4 border rounded-md bg-gray-50">
                                        {selectedPaymentMethod.gateway === 'mercadopago' && (
                                            <div className="space-y-6">
                                                {selectedPaymentMethod.id === 'mp_wallet' && (
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

                                                {selectedPaymentMethod.id === 'mp_card' && (
                                                    <div className="border-t border-gray-200 pt-4">
                                                        <h4 className="mb-3 text-sm font-semibold text-gray-700">
                                                            Pagar con tarjeta
                                                        </h4>
                                                        <MercadoPagoCard
                                                            orderId={checkoutSession.orderId}
                                                            user={{
                                                                email: payerData.email || '',
                                                                firstName: payerData.firstName,
                                                                lastName: payerData.lastName,
                                                                phone: payerData.phone,
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {selectedPaymentMethod.gateway === 'openpay' && orderSummary && (
                                            <div className="space-y-4 text-sm text-gray-700">
                                                {selectedPaymentMethod.id === 'op_card' && (
                                                    <OpenpayCardPayment
                                                        orderId={orderSummary.orderId}
                                                        amount={orderSummary.total}
                                                        description={eventTitle || 'Pago de boletos'}
                                                        customerName={orderSummary.buyer.name || ''}
                                                        customerEmail={orderSummary.buyer.email}
                                                        customerPhone={orderSummary.buyer.phone || undefined}
                                                    />
                                                )}
                                                {selectedPaymentMethod.id === 'op_spei' && (
                                                    <SpeiPaymentButton
                                                        orderId={orderSummary.orderId}
                                                        amount={orderSummary.total}
                                                        description={eventTitle || 'Pago de boletos'}
                                                        customerName={orderSummary.buyer.name || ''}
                                                        customerEmail={orderSummary.buyer.email}
                                                        customerPhone={orderSummary.buyer.phone || undefined}
                                                    />
                                                )}
                                                {selectedPaymentMethod.id === 'op_oxxo' && (
                                                    <OxxoPaymentButton
                                                        orderId={orderSummary.orderId}
                                                        amount={orderSummary.total}
                                                        description={eventTitle || 'Pago de boletos'}
                                                        customerName={orderSummary.buyer.name || ''}
                                                        customerEmail={orderSummary.buyer.email}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="mt-10 lg:mt-0 lg:col-span-5">
                        <CheckoutSummary
                            event={eventSummary}
                            tickets={ticketsSummary}
                            orderSummary={orderSummary}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
