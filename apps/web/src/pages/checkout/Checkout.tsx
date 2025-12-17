import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import CountdownTimer from '../../components/checkout/CountdownTimer';
import { apiClient, CheckoutOrderSummary } from '../../api/client';

export function Checkout() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { templateId, quantity = 1, eventTitle, templateName, price, eventDate, eventVenue } =
        (location.state as Record<string, any>) || {};

    const [checkoutSession, setCheckoutSession] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [orderSummary, setOrderSummary] = useState<CheckoutOrderSummary | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [manualCompleteError, setManualCompleteError] = useState('');
    const [finalizingManualOrder, setFinalizingManualOrder] = useState(false);
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    const isRecaptchaEnabled = Boolean(recaptchaSiteKey);

    const {
        register,
        handleSubmit,
        formState: { errors },
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
            setManualCompleteError('');
            const summary = await apiClient.getCheckoutOrder(session.orderId);
            setOrderSummary(summary);
        } catch (err: any) {
            const rawMessage = (err?.message as string | undefined)?.toLowerCase();
            let friendly = 'No pudimos iniciar tu checkout. Intenta nuevamente en unos minutos.';
            if (rawMessage?.includes('network')) {
                friendly = 'Hay un problema de conexion. Revisa tu internet e intentalo de nuevo.';
            } else if (rawMessage?.includes('order already paid')) {
                friendly = 'Esta orden ya fue pagada. Revisa tu correo para encontrar tus boletos.';
            }
            setError(friendly);
        } finally {
            setLoading(false);
        }
    };

    const finalizeManualOrder = async () => {
        if (!checkoutSession?.orderId) {
            return;
        }
        setManualCompleteError('');
        setFinalizingManualOrder(true);
        try {
            const manualResult = await apiClient.completeManualOrder(checkoutSession.orderId);
            const ticketIds = manualResult?.tickets?.map((ticket) => ticket.id) ?? [];
            navigate(`/checkout/success?orderId=${checkoutSession.orderId}&status=completed`, {
                state: { ticketIds },
            });
        } catch (err: any) {
            const message =
                (err?.message as string | undefined) ||
                'No pudimos confirmar tu compra. Intenta de nuevo en unos segundos.';
            setManualCompleteError(message);
        } finally {
            setFinalizingManualOrder(false);
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
                                                <span className="text-red-500 text-xs">Email invalido</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label
                                            htmlFor="phone"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Telefono
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="tel"
                                                id="phone"
                                                placeholder="5512345678"
                                                {...register('phone', {
                                                    required: 'Telefono requerido',
                                                    pattern: {
                                                        value: /^\d{10}$/,
                                                        message: 'Debe ser un telefono de 10 digitos',
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
                                            {loading ? 'Procesando...' : 'Continuar al siguiente paso'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-6 space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Modo prueba sin pago en linea
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Tu orden{' '}
                                        <span className="font-semibold text-gray-900">
                                            {checkoutSession.orderId}
                                        </span>{' '}ya fue reservada. En este modo de prueba no se procesan pagos en linea;
                                        confirma manualmente con el organizador para completar la compra.
                                    </p>
                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                        <li>
                                            Importe estimado: ${Number(orderSummary?.total ?? checkoutSession.total).toFixed(2)}{' '}
                                            {orderSummary?.currency ?? checkoutSession.currency ?? 'MXN'}
                                        </li>
                                        <li>
                                            Reserva valida hasta{' '}
                                            {new Date(checkoutSession.expiresAt).toLocaleString('es-MX')}
                                        </li>
                                        <li>Recibiras instrucciones por correo cuando se confirme el pago.</li>
                                    </ul>
                                    <button
                                        type="button"
                                        onClick={finalizeManualOrder}
                                        disabled={finalizingManualOrder}
                                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                                    >
                                        {finalizingManualOrder ? 'Generando boletos...' : 'Finalizar reserva sin pago en linea'}
                                    </button>
                                    {manualCompleteError && (
                                        <p className="text-sm text-red-600 text-center">{manualCompleteError}</p>
                                    )}
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
