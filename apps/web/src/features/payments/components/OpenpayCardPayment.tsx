import { FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import { loadOpenpayScripts } from '../../../lib/loadOpenpayScripts';

type Props = {
    orderId: string;
    amount: number;
    currency?: 'MXN';
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
};

function splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) {
        return { firstName: '', lastName: '' };
    }
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
}

export function OpenpayCardPayment({
    orderId,
    amount,
    currency = 'MXN',
    description,
    customerName,
    customerEmail,
    customerPhone,
}: Props) {
    const formRef = useRef<HTMLFormElement | null>(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!formRef.current) {
            setError('Formulario de tarjeta no está listo. Intenta recargar la página.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const openpay = await loadOpenpayScripts();
            openpay.setId(import.meta.env.VITE_OPENPAY_MERCHANT_ID);
            openpay.setApiKey(import.meta.env.VITE_OPENPAY_PUBLIC_KEY);
            openpay.setSandboxMode(import.meta.env.VITE_OPENPAY_SANDBOX === 'true');

            const form = formRef.current;

            // Device session id para antifraude
            const deviceSessionId = openpay.deviceData.setup(form.id, 'openpay-device-id');

            const tokenId = await new Promise<string>((resolve, reject) => {
                openpay.token.create(
                    form,
                    (response) => {
                        resolve(response.data.id);
                    },
                    (errorResponse) => {
                        const message =
                            errorResponse?.data?.description ||
                            'No pudimos validar tu tarjeta. Revisa los datos e inténtalo de nuevo.';
                        reject(new Error(message));
                    },
                );
            });

            const { firstName, lastName } = splitName(customerName);

            const charge = await apiClient.createOpenpayCharge({
                orderId,
                amount,
                currency,
                description,
                tokenId,
                deviceSessionId,
                customer: {
                    name: firstName || customerName,
                    last_name: lastName || 'BBVA', // Enfatizamos BBVA para tracking interno / UX
                    email: customerEmail,
                    phone_number: customerPhone || '',
                },
            });

            const status = (charge.status || 'completed').toLowerCase();
            navigate(`/checkout/success?orderId=${orderId}&status=${status}`);
        } catch (err: any) {
            const msg =
                err?.message ||
                'No pudimos procesar el pago con tarjeta Openpay. Intenta nuevamente o usa otro método de pago.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const formattedAmount = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency || 'MXN',
    }).format(amount);

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Orden</p>
                        <p className="font-semibold text-gray-900">{orderId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Total a pagar</p>
                        <p className="text-xl font-bold text-gray-900">{formattedAmount}</p>
                    </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                    Pagarás con tarjeta a través de{' '}
                    <span className="font-medium text-gray-900">Openpay / BBVA</span>.
                </p>
                <p className="mt-1 text-xs text-gray-400">
                    Recomendado para tarjetas BBVA; también funciona con otras tarjetas de crédito y débito.
                </p>
            </div>

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <form
                id="openpay-card-form"
                ref={formRef}
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                <input type="hidden" id="openpay-device-id" name="deviceSessionId" />

                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="holder_name">
                        Nombre del titular (como en la tarjeta)
                    </label>
                    <input
                        id="holder_name"
                        name="holder_name"
                        defaultValue={customerName}
                        autoComplete="cc-name"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="card_number">
                        Número de tarjeta
                    </label>
                    <input
                        id="card_number"
                        name="card_number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="4111 1111 1111 1111"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        required
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700"
                            htmlFor="expiration_month"
                        >
                            Mes
                        </label>
                        <input
                            id="expiration_month"
                            name="expiration_month"
                            inputMode="numeric"
                            placeholder="MM"
                            maxLength={2}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700"
                            htmlFor="expiration_year"
                        >
                            Año
                        </label>
                        <input
                            id="expiration_year"
                            name="expiration_year"
                            inputMode="numeric"
                            placeholder="AA"
                            maxLength={2}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="cvv2">
                            CVV
                        </label>
                        <input
                            id="cvv2"
                            name="cvv2"
                            inputMode="numeric"
                            placeholder="CVC"
                            maxLength={4}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-indigo-600 py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Procesando pago...' : 'Pagar con tarjeta (Openpay / BBVA)'}
                </button>

                <p className="mt-2 text-xs text-gray-400 text-center">
                    Tus datos de tarjeta se procesan de forma segura por Openpay / BBVA. MonoMarket
                    no almacena tu información de tarjeta.
                </p>
            </form>
        </div>
    );
}

