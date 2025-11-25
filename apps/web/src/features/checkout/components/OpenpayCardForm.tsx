import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { components } from '@monomarket/contracts';
import { apiClient } from '../../../api/client';
import { loadOpenpayScripts } from '../../../lib/loadOpenpayScripts';

type OpenpayChargeResponse = components['schemas']['OpenpayChargeResponse'];

type OpenpayCardFormProps = {
    amount: number;
    description: string;
    orderId: string;
    currency?: 'MXN';
    customer: {
        name: string;
        lastName: string;
        email: string;
        phone: string;
    };
    onSuccess?: (response: OpenpayChargeResponse) => void;
    onError?: (message: string) => void;
};

type FormState = {
    holderName: string;
    cardNumber: string;
    expirationMonth: string;
    expirationYear: string;
    cvv: string;
};

const INITIAL_FORM_STATE: FormState = {
    holderName: '',
    cardNumber: '',
    expirationMonth: '',
    expirationYear: '',
    cvv: '',
};

export function OpenpayCardForm({
    amount,
    currency = 'MXN',
    description,
    orderId,
    customer,
    onSuccess,
    onError,
}: OpenpayCardFormProps) {
    const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [sdkError, setSdkError] = useState<string | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    const formId = useMemo(() => `openpay-card-form-${orderId}`, [orderId]);
    const deviceFieldId = `${formId}-device-session`;

    useEffect(() => {
        let cancelled = false;

        loadOpenpayScripts()
            .then((OpenPay) => {
                if (cancelled) return;

                const merchantId = import.meta.env.VITE_OPENPAY_MERCHANT_ID;
                const publicKey = import.meta.env.VITE_OPENPAY_PUBLIC_KEY;
                const sandboxFlag = (import.meta.env.VITE_OPENPAY_SANDBOX ?? 'true') === 'true';

                if (!merchantId || !publicKey) {
                    throw new Error('Faltan las llaves públicas de Openpay');
                }

                // Solo utilizamos las llaves públicas de Openpay desde el frontend;
                // las llaves privadas permanecen en el backend.
                OpenPay.setId(merchantId);
                OpenPay.setApiKey(publicKey);
                OpenPay.setSandboxMode(sandboxFlag);

                setSdkReady(true);
            })
            .catch((error: Error) => {
                if (cancelled) return;
                setSdkError(error.message || 'No fue posible inicializar Openpay');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormState((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
    };

    const tokenizeCard = () => new Promise<{ data: { id: string } }>((resolve, reject) => {
        window.OpenPay?.token.create(
            formRef.current as HTMLFormElement,
            (response) => resolve(response as { data: { id: string } }),
            (error) => reject(error),
        );
    });

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!window.OpenPay || !formRef.current) {
            setStatusMessage('Openpay no está disponible en este momento.');
            return;
        }

        setLoading(true);
        setStatusMessage('Procesando pago...');

        try {
            const deviceSessionId =
                window.OpenPay.deviceData.setup(formId, deviceFieldId) ||
                hiddenInputRef.current?.value ||
                '';

            const tokenResponse = await tokenizeCard();
            const tokenId = tokenResponse.data.id;

            const chargePayload = {
                amount,
                currency,
                description,
                orderId,
                tokenId,
                deviceSessionId,
                customer: {
                    name: customer.name,
                    last_name: customer.lastName || customer.name,
                    email: customer.email,
                    phone_number: customer.phone,
                },
            };

            const response = await apiClient.createOpenpayCharge(chargePayload);
            setStatusMessage('Pago aprobado, revisa tu correo para descargar tus boletos.');
            onSuccess?.(response);
        } catch (error: any) {
            const backendMessage = error?.message || error?.data?.description;
            const message =
                backendMessage ||
                'No pudimos procesar tu pago. Revisa los datos de la tarjeta o inténtalo más tarde.';
            setStatusMessage(message);
            onError?.(message);
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent';

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Pago con tarjeta</h2>

            {sdkError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm">
                    {sdkError}
                </div>
            )}

            {statusMessage && !sdkError && (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-6 text-sm">
                    {statusMessage}
                </div>
            )}

            <form id={formId} ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" id={deviceFieldId} ref={hiddenInputRef} value="" />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del titular</label>
                    <input
                        type="text"
                        name="holder_name"
                        data-openpay-card="holder_name"
                        required
                        value={formState.holderName}
                        onChange={handleChange('holderName')}
                        className={inputClass}
                        placeholder="Como aparece en la tarjeta"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de tarjeta</label>
                    <input
                        type="tel"
                        inputMode="numeric"
                        name="card_number"
                        data-openpay-card="card_number"
                        required
                        value={formState.cardNumber}
                        onChange={handleChange('cardNumber')}
                        className={inputClass}
                        placeholder="4111 1111 1111 1111"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mes expiración</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            name="expiration_month"
                            data-openpay-card="expiration_month"
                            required
                            value={formState.expirationMonth}
                            onChange={handleChange('expirationMonth')}
                            className={inputClass}
                            placeholder="MM"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Año expiración</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            name="expiration_year"
                            data-openpay-card="expiration_year"
                            required
                            value={formState.expirationYear}
                            onChange={handleChange('expirationYear')}
                            className={inputClass}
                            placeholder="YY"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            name="cvv2"
                            data-openpay-card="cvv2"
                            required
                            value={formState.cvv}
                            onChange={handleChange('cvv')}
                            className={inputClass}
                            placeholder="123"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !sdkReady}
                    className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    {loading ? 'Procesando pago…' : 'Pagar ahora'}
                </button>
                <p className="text-center text-xs text-gray-400">
                    Los datos se tokenizan con Openpay sin almacenarse en nuestros servidores.
                </p>
            </form>
        </div>
    );
}
