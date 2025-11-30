import React from 'react';
import { RadioGroup } from '@headlessui/react';

export const PAYMENT_METHODS = [
    { id: 'mercadopago', title: 'Mercado Pago', description: 'Paga con tu cuenta de Mercado Pago' },
    // Openpay (tarjeta/SPEI/OXXO) deshabilitado temporalmente; reactivar aquí cuando se requiera.
];

interface PaymentMethodsProps {
    selected: typeof PAYMENT_METHODS[0];
    onChange: (method: typeof PAYMENT_METHODS[0]) => void;
}

const PaymentMethods: React.FC<PaymentMethodsProps> = ({ selected, onChange }) => {
    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-md">
                <RadioGroup value={selected} onChange={onChange}>
                    <RadioGroup.Label className="sr-only">Método de Pago</RadioGroup.Label>
                    <div className="space-y-2">
                        {PAYMENT_METHODS.map((method) => (
                            <RadioGroup.Option
                                key={method.id}
                                value={method}
                                className={({ active, checked }) =>
                                    `${active ? 'ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-300' : ''}
                  ${checked ? 'bg-indigo-600 bg-opacity-75 text-white' : 'bg-white'}
                    relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none`
                                }
                            >
                                {({ checked }) => (
                                    <>
                                        <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="text-sm">
                                                    <RadioGroup.Label
                                                        as="p"
                                                        className={`font-medium  ${checked ? 'text-white' : 'text-gray-900'}`}
                                                    >
                                                        {method.title}
                                                    </RadioGroup.Label>
                                                    <RadioGroup.Description
                                                        as="span"
                                                        className={`inline ${checked ? 'text-indigo-100' : 'text-gray-500'}`}
                                                    >
                                                        {method.description}
                                                    </RadioGroup.Description>
                                                </div>
                                            </div>
                                            {checked && (
                                                <div className="shrink-0 text-white">
                                                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                                                        <circle cx="12" cy="12" r="12" fill="#fff" opacity="0.2" />
                                                        <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </>
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
