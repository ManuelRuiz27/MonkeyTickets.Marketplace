import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export function CheckoutSuccess() {
    const location = useLocation();
    const navigate = useNavigate();
    const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

    const orderId = query.get('orderId');
    const source = query.get('source');
    const rawStatusParam = query.get('status');
    const rawStatus = (rawStatusParam || (source === 'mp' ? 'pending' : 'completed')).toLowerCase();
    const state = (location.state as { ticketIds?: string[] } | null) ?? null;

    const isCompleted = rawStatus === 'completed' || rawStatus === 'approved';
    const isInReview = rawStatus === 'in_review' || rawStatus === 'pending' || rawStatus === 'in_process';
    const isFailed = rawStatus === 'failed' || rawStatus === 'rejected' || rawStatus === 'cancelled';
    const isMpSource = source === 'mp';

    const presetTicketIds = state?.ticketIds ?? [];
    const presetTicketKey = presetTicketIds.join(',');
    const [ticketIds, setTicketIds] = useState<string[]>(presetTicketIds);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [ticketError, setTicketError] = useState('');
    const [hasRequestedTickets, setHasRequestedTickets] = useState(Boolean(presetTicketIds.length));
    const apiBaseUrl = import.meta.env.VITE_API_URL || '';

    useEffect(() => {
        if (presetTicketIds.length) {
            setTicketIds(presetTicketIds);
            setHasRequestedTickets(true);
        }
    }, [presetTicketKey]);

    useEffect(() => {
        if (!orderId || !isCompleted || hasRequestedTickets) {
            return;
        }

        let cancelled = false;
        setHasRequestedTickets(true);
        setLoadingTickets(true);
        setTicketError('');

        const loadTickets = isMpSource
            ? apiClient.getCheckoutOrderTickets(orderId)
            : apiClient.completeManualOrder(orderId);

        loadTickets
            .then((response) => {
                if (cancelled) {
                    return;
                }

                const ids = response?.tickets?.map((ticket) => ticket.id) ?? [];
                setTicketIds(ids);
                if (!ids.length) {
                    setTicketError('Aun estamos generando tus boletos. Refresca en un momento o revisa tu correo.');
                }
            })
            .catch(() => {
                if (!cancelled) {
                    const message = isMpSource
                        ? 'Pago en confirmacion. Revisa tu correo o intenta mas tarde.'
                        : 'No pudimos recuperar tus boletos. Intenta de nuevo o contacta al organizador.';
                    setTicketError(message);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingTickets(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [orderId, isCompleted, hasRequestedTickets, isMpSource]);

    let title = 'Compra completada';
    let message =
        'Tu pago fue aprobado. RecibirA­s tus boletos en minutos en el correo que registraste.';
    let iconBg = 'bg-green-100';
    let iconColor = 'text-green-600';

    if (isInReview) {
        title = 'Pago en revision';
        message =
            'Estamos revisando tu pago. Te avisaremos por correo en cuanto se confirme. Esto puede tomar unos minutos.';
        iconBg = 'bg-yellow-100';
        iconColor = 'text-yellow-600';
    } else if (isFailed) {
        title = 'Pago no completado';
        message =
            'Tu pago no pudo completarse. Si ves un cargo en tu estado de cuenta, se revisara manualmente y se te notificara.';
        iconBg = 'bg-red-100';
        iconColor = 'text-red-600';
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className={`w-20 h-20 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    <svg className={`w-10 h-10 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isFailed ? (
                            <>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" />
                            </>
                        ) : isInReview ? (
                            <>
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l2 2m6-4a8 8 0 11-16 0 8 8 0 0116 0z"
                                />
                            </>
                        ) : (
                            <>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 22a10 10 0 100-20 10 10 0 000 20z"
                                />
                            </>
                        )}
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                {orderId && (
                    <div className="bg-gray-50 rounded-xl p-6 text-left space-y-4 mb-8">
                        <div>
                            <p className="text-sm text-gray-500">NA§mero de orden</p>
                            <p className="font-mono text-gray-900 text-lg break-all">{orderId}</p>
                        </div>
                        {isCompleted && (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600">Descarga tus boletos:</p>
                                {ticketError && <p className="text-xs text-red-600">{ticketError}</p>}
                                {loadingTickets && <p className="text-xs text-gray-500">Generando PDF...</p>}
                                {!loadingTickets && ticketIds.length > 0 && (
                                    <div className="space-y-2">
                                        {ticketIds.map((ticketId, index) => (
                                            <a
                                                key={ticketId}
                                                href={`${apiBaseUrl}/tickets/${ticketId}/pdf`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex w-full items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                                            >
                                                Descargar boleto {index + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}
                                {!loadingTickets && !ticketIds.length && !ticketError && (
                                    <p className="text-xs text-gray-500">
                                        Estamos generando tus boletos. En segundos podrA­s descargarlos o revisa tu correo.
                                    </p>
                                )}
                            </div>
                        )}
                        {isInReview && (
                            <p className="text-xs text-gray-500 mt-2">
                                Cuando el pago se confirme, te enviaremos automA­ticamente tus boletos al correo que
                                registraste.
                            </p>
                        )}
                        {isFailed && (
                            <p className="text-xs text-gray-500 mt-2">
                                Puedes intentar de nuevo desde la pA­gina del evento o usar otro mActodo de pago.
                            </p>
                        )}
                    </div>
                )}
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                    Volver al inicio
                </button>
            </div>
        </div>
    );
}
