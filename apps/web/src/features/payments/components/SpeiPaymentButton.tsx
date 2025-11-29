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
    customerPhone?: string;
};

export function SpeiPaymentButton({
    orderId,
    amount,
    currency = 'MXN',
    description,
    customerName,
    customerEmail,
    customerPhone,
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
                    bank: string;
                    clabe: string;
                    agreement?: string;
                };
                expiresAt: string;
            }>('/payments/openpay/spei', {
                method: 'POST',
                body: JSON.stringify({
                    orderId,
                    amount,
                    currency,
                    description,
                    customerName,
                    customerEmail,
                    customerPhone,
                }),
            });

            // Redirigir a página de instrucciones SPEI
            navigate(`/checkout/pending-spei/${orderId}`, {
                state: {
                    chargeId: response.id,
                    clabe: response.paymentMethod.clabe,
                    bank: response.paymentMethod.bank,
                    agreement: response.paymentMethod.agreement,
                    amount: response.amount,
                    expiresAt: response.expiresAt,
                    orderId: response.orderId,
                },
            });
        } catch (err: any) {
            const message = err?.message || 'No pudimos generar el cargo SPEI. Intenta más tarde.';
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

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    📱 ¿Cómo funciona SPEI?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ Recibirás una CLABE interbancaria</li>
                    <li>✅ Realiza la transferencia desde tu banco</li>
                    <li>✅ Tus boletos llegarán por email al confirmar el pago</li>
                    <li>⏰ Tienes 72 horas para completar el pago</li>
                </ul>
            </div>

            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generando CLABE...
                    </span>
                ) : (
                    '💳 Generar Ficha SPEI'
                )}
            </button>

            <p className="text-xs text-gray-500 text-center">
                Al confirmar, se generará una ficha de pago con instrucciones para realizar la transferencia bancaria.
            </p>
        </div>
    );
}
