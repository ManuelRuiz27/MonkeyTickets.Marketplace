import { useId, useRef, useState } from 'react';
import { apiClient } from '../../../api/client';
import { getMercadoPagoInstance } from '../../../lib/mercadoPago';

type Props = {
    orderId: string;
    title: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    currency?: 'MXN';
    payerEmail: string;
};

export function MercadoPagoButton({
    orderId,
    title,
    description,
    quantity,
    unitPrice,
    currency = 'MXN',
    payerEmail,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [walletReady, setWalletReady] = useState(false);
    const walletContainerId = useId();
    const bricksController = useRef<{ destroy?: () => void } | null>(null);

    const handleClick = async () => {
        setError(null);
        setLoading(true);

        try {
            const preference = await apiClient.createMercadoPagoPreference({
                orderId,
                title,
                description,
                quantity,
                unitPrice,
                currency,
                payer: {
                    email: payerEmail,
                },
            });

            if (preference.initPoint) {
                window.location.href = preference.initPoint;
                return;
            }

            const preferenceId = preference.preferenceId;
            if (!preferenceId) {
                throw new Error('No se pudo generar la preferencia de pago.');
            }

            const mp = await getMercadoPagoInstance();
            const bricks = mp.bricks();

            if (walletReady && typeof bricksController.current?.destroy === 'function') {
                bricksController.current?.destroy();
            }

            await bricks.create('wallet', walletContainerId, {
                initialization: {
                    preferenceId,
                },
            });

            setWalletReady(true);
        } catch (err: any) {
            const message = err?.message || 'No pudimos iniciar Mercado Pago. Intentalo mas tarde.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
                {loading ? 'Conectando con Mercado Pago' : 'Pagar con Mercado Pago'}
            </button>

            <div id={walletContainerId} className={walletReady ? 'block' : 'hidden'} />
        </div>
    );
}
