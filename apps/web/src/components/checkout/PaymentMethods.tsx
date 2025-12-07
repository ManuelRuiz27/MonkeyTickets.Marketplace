import React from 'react';
import { RadioGroup } from '@headlessui/react';

export type PaymentGateway = 'mercadopago' | 'openpay';

export type PaymentMethodId =
    | 'mp_wallet'
    | 'mp_card'
    | 'op_card'
    | 'op_spei'
    | 'op_oxxo';

export interface PaymentMethod {
    id: PaymentMethodId;
    gateway: PaymentGateway;
    title: string;
    description: string;
}

export const PAYMENT_GATEWAYS: { id: PaymentGateway; title: string; subtitle: string }[] = [
    {
        id: 'mercadopago',
        title: 'Mercado Pago',
        subtitle: 'Wallet, Google Pay / Apple Pay y tarjeta',
    },
    {
        id: 'openpay',
        title: 'Openpay',
        subtitle: 'Tarjeta, SPEI y OXXO',
    },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
    {
        id: 'mp_wallet',
        gateway: 'mercadopago',
        title: 'Mercado Pago Wallet',
        description: 'Paga con tu cuenta de Mercado Pago, saldo o tarjetas guardadas.',
    },
    {
        id: 'mp_card',
        gateway: 'mercadopago',
        title: 'Tarjeta (vía Mercado Pago)',
        description: 'Tarjeta de crédito o débito procesada por Mercado Pago.',
    },
    {
        id: 'op_card',
        gateway: 'openpay',
        title: 'Tarjeta (vía Openpay)',
        description: 'Tarjeta de crédito o débito procesada por Openpay.',
    },
    {
        id: 'op_spei',
        gateway: 'openpay',
        title: 'Transferencia SPEI',
        description: 'Te damos una CLABE para transferencia desde tu banco.',
    },
    {
        id: 'op_oxxo',
        gateway: 'openpay',
        title: 'Pago en OXXO',
        description: 'Generamos una referencia para pagar en efectivo en OXXO.',
    },
];

interface PaymentMethodsProps {
    gateway: PaymentGateway;
    method: PaymentMethod;
    onGatewayChange: (gateway: PaymentGateway) => void;
    onMethodChange: (method: PaymentMethod) => void;
}

const PaymentMethods: React.FC<PaymentMethodsProps> = ({
    gateway,
    method,
    onGatewayChange,
    onMethodChange,
}) => {
    const methodsForGateway = PAYMENT_METHODS.filter((m) => m.gateway === gateway);

    return (
        <div className="w-full space-y-4">
            {/* Tabs de pasarela */}
            <div className="inline-flex rounded-md shadow-sm border border-gray-200 bg-white overflow-hidden">
                {PAYMENT_GATEWAYS.map((g) => {
                    const isActive = g.id === gateway;
                    return (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => onGatewayChange(g.id)}
                            className={[
                                'px-4 py-2 text-sm font-medium focus:outline-none focus:z-10',
                                isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50',
                            ].join(' ')}
                        >
                            <div className="flex flex-col items-start">
                                <span>{g.title}</span>
                                <span className={`text-xs ${isActive ? 'text-indigo-100' : 'text-gray-400'}`}>
                                    {g.subtitle}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Métodos dentro de la pasarela seleccionada */}
            <div className="w-full max-w-md">
                <RadioGroup value={method} onChange={onMethodChange}>
                    <RadioGroup.Label className="sr-only">Método de pago</RadioGroup.Label>
                    <div className="space-y-2">
                        {methodsForGateway.map((m) => (
                            <RadioGroup.Option
                                key={m.id}
                                value={m}
                                className={({ active, checked }) =>
                                    `${active ? 'ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-300' : ''}
                                     ${checked ? 'bg-indigo-600 bg-opacity-75 text-white' : 'bg-white'}
                                     relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none`
                                }
                            >
                                {({ checked }) => (
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="text-sm">
                                                <RadioGroup.Label
                                                    as="p"
                                                    className={`font-medium ${checked ? 'text-white' : 'text-gray-900'}`}
                                                >
                                                    {m.title}
                                                </RadioGroup.Label>
                                                <RadioGroup.Description
                                                    as="span"
                                                    className={`inline ${checked ? 'text-indigo-100' : 'text-gray-500'}`}
                                                >
                                                    {m.description}
                                                </RadioGroup.Description>
                                            </div>
                                        </div>
                                        {checked && (
                                            <div className="shrink-0 text-white">
                                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="12" r="12" fill="#fff" opacity="0.2" />
                                                    <path
                                                        d="M7 13l3 3 7-7"
                                                        stroke="#fff"
                                                        strokeWidth={1.5}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </RadioGroup.Option>
                        ))}
                    </div>
                </RadioGroup>
            </div>
        </div>
    );
};

export default PaymentMethods;
