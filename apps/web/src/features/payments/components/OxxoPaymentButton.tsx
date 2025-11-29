import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';

type Props = {
    orderId: string;
    amount: number;
    currency?: 'MXN';
    description: string;
    customerName: string;
    customerEmail: string;
    daysToExpire?: number;
};

export function OxxoPaymentButton({
    orderId,
    amount,
    currency = 'MXN',
    description,
    customerName,
    customerEmail,
    daysToExpire = 3,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleClick = async () => {
        setError(null);
        setLoading(true);

        try {
            const response = await apiClient.request<{
                id: string;
                amount: number;
                currency: string;
                status: string;
                creationDate: string;
                orderId: string;
                paymentMethod: {
                    type: string;
                    reference: string;
                    barcodeUrl: string;
                };
                expiresAt: string;
            }>('/payments/openpay/oxxo', {
                method: 'POST',
                body: JSON.stringify({
                    orderId,
                    amount,
                    currency,
                    description,
                    customerName,
                    customerEmail,
                    daysToExpire,
                }),
            });

            // Redirigir a página de instrucciones OXXO
            navigate(`/checkout/pending-oxxo/${orderId}`, {
                state: {
                    chargeId: response.id,
                    reference: response.paymentMethod.reference,
                    barcodeUrl: response.paymentMethod.barcodeUrl,
                    amount: response.amount,
                    expiresAt: response.expiresAt,
                    orderId: response.orderId,
                },
            });
        } catch (err: any) {
            const message = err?.message || 'No pudimos generar el código OXXO. Intenta más tarde.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-red-900 mb-2">
                    🏪 ¿Cómo funciona OXXO Pay?
                </h4>
                <ul className="text-sm text-red-800 space-y-1">
                    <li>✅ Recibirás un código de barras para imprimir o mostrar</li>
                    <li>✅ Acude a cualquier tienda OXXO y paga en efectivo</li>
                    <li>✅ Tus boletos llegarán por email al confirmar el pago</li>
                    <li>⏰ Tienes {daysToExpire} días para completar el pago</li>
                </ul>
            </div>

            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generando código OXXO...
                    </span>
                ) : (
                    '🏪 Generar Ficha OXXO'
                )}
            </button>

            <p className="text-xs text-gray-500 text-center">
                Al confirmar, se generará una ficha de pago con código de barras para pagar en cualquier OXXO.
            </p>
        </div>
    );
}
