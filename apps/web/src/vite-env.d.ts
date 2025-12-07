/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_OPENPAY_MERCHANT_ID: string;
    readonly VITE_OPENPAY_PUBLIC_KEY: string;
    readonly VITE_OPENPAY_SANDBOX: string;
    readonly VITE_MP_PUBLIC_KEY: string;
    readonly VITE_MP_LOCALE?: string;
    readonly VITE_RECAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

type OpenpayTokenCallbacks = {
    data: {
        id: string;
        card?: {
            type?: string;
            brand?: string;
        };
    };
};

type OpenpayTokenError = {
    error_code: number;
    description: string;
    category?: string;
};

interface OpenPayGlobal {
    setId(id: string): void;
    setApiKey(key: string): void;
    setSandboxMode(enabled: boolean): void;
    token: {
        create(
            form: HTMLFormElement,
            successCallback: (response: OpenpayTokenCallbacks) => void,
            errorCallback: (error: { data: OpenpayTokenError }) => void,
        ): void;
    };
    deviceData: {
        setup(formId: string, deviceFieldId: string): string;
    };
}

interface MercadoPagoConstructor {
    new (publicKey: string, options?: { locale?: string }): MercadoPagoInstance;
}

type CardPaymentBrickFormData = {
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

type CardPaymentBrickController = {
    destroy: () => void;
};

interface MercadoPagoBricks {
    create(
        name: 'wallet',
        containerId: string,
        options: {
            initialization: { preferenceId: string };
        },
    ): Promise<void>;
    create(
        name: 'cardPayment',
        containerId: string,
        options: {
            initialization: { amount: number };
            customization?: Record<string, unknown>;
            callbacks: {
                onReady?: () => void;
                onError?: (error: unknown) => void;
                onSubmit: (data: { formData: CardPaymentBrickFormData }) => Promise<void>;
            };
        },
    ): Promise<CardPaymentBrickController>;
}

interface MercadoPagoInstance {
    bricks(): MercadoPagoBricks;
}

declare global {
    interface Window {
        OpenPay?: OpenPayGlobal;
        MercadoPago?: MercadoPagoConstructor;
    }
}

export { };
