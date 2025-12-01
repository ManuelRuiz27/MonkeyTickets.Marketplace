const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

export type WalletBrickController = {
    destroy: () => void;
};

export type CardPaymentBrickController = {
    destroy: () => void;
};

type CardPaymentOnSubmitEvent = {
    formData: {
        token: string;
        payment_method_id?: string;
        issuer_id?: string;
        installments?: number;
        payer?: {
            identification?: {
                type?: string;
                number?: string;
            };
        };
    };
};

type MercadoPagoBricks = {
    create(
        name: 'wallet',
        containerId: string,
        options: { initialization: { preferenceId: string } },
    ): Promise<WalletBrickController>;
    create(
        name: 'cardPayment',
        containerId: string,
        options: {
            initialization: { amount: number };
            callbacks: {
                onReady?: () => void;
                onError?: (error: unknown) => void;
                onSubmit: (event: CardPaymentOnSubmitEvent) => Promise<void | unknown>;
            };
            customization?: Record<string, unknown>;
        },
    ): Promise<CardPaymentBrickController>;
};

type MercadoPagoInstance = {
    bricks(): MercadoPagoBricks;
};

type MercadoPagoConstructor = new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;

declare global {
    interface Window {
        MercadoPago?: MercadoPagoConstructor;
    }
}

let scriptPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Mercado Pago SDK no está disponible en SSR'));
    }

    if (window.MercadoPago) {
        return Promise.resolve();
    }

    if (!scriptPromise) {
        scriptPromise = new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
            if (existing) {
                existing.addEventListener('load', () => resolve());
                existing.addEventListener('error', () => reject(new Error('No se pudo cargar el SDK de Mercado Pago')));
                return;
            }

            const script = document.createElement('script');
            script.src = SDK_URL;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
            document.body.appendChild(script);
        }).catch((error) => {
            scriptPromise = null;
            throw error;
        });
    }

    return scriptPromise;
}

export async function getMercadoPagoInstance(): Promise<MercadoPagoInstance> {
    await loadSdk();

    if (!window.MercadoPago) {
        throw new Error('Mercado Pago no se inicializó correctamente');
    }

    const locale = import.meta.env.VITE_MP_LOCALE ?? 'es-MX';
    return new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale });
}
