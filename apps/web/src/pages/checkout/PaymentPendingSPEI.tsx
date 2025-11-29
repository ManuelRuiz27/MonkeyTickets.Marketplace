import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';

export function PaymentPendingSPEI() {
    const { orderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const { clabe, bank, agreement, amount, expiresAt } = location.state || {};

    useEffect(() => {
        if (!location.state) {
            navigate('/');
        }
    }, [location.state, navigate]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(value);
    };

    const formatExpirationDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'full',
            timeStyle: 'short',
        }).format(date);
    };

    if (!location.state) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">¡Pedido Registrado!</h1>
                    <p className="mt-2 text-gray-600">
                        Orden #{orderId?.slice(0, 8)}
                    </p>
                </div>

                {/* SPEI Instructions Card */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                        <h2 className="text-xl font-semibold text-white flex items-center">
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Instrucciones de Pago SPEI
                        </h2>
                    </div>

                    <div className="px-6 py-6 space-y-6">
                        {/* Amount */}
                        <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-blue-900">Monto a transferir:</span>
                                <span className="text-2xl font-bold text-blue-900">{formatCurrency(amount)}</span>
                            </div>
                        </div>

                        {/* CLABE */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CLABE Interbancaria
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3">
                                    <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider text-center">
                                        {clabe}
                                    </p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(clabe)}
                                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    title="Copiar CLABE"
                                >
                                    {copied ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Bank & Agreement */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                                <p className="text-lg font-semibold text-gray-900">{bank || 'STP'}</p>
                            </div>
                            {agreement && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Convenio</label>
                                    <p className="text-lg font-semibold text-gray-900">{agreement}</p>
                                </div>
                            )}
                        </div>

                        {/* Expiration */}
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <div className="flex">
                                <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">
                                        Fecha límite de pago
                                    </p>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        {formatExpirationDate(expiresAt)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Steps */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pasos para pagar:</h3>
                            <ol className="space-y-3">
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                                    <p className="ml-4 text-gray-700">Ingresa a tu banca móvil o en línea</p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                                    <p className="ml-4 text-gray-700">Selecciona "Transferencia SPEI" o "Pago a terceros"</p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                                    <p className="ml-4 text-gray-700">Ingresa la CLABE interbancaria: <span className="font-mono font-bold">{clabe}</span></p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                                    <p className="ml-4 text-gray-700">Transfiere exactamente <span className="font-bold">{formatCurrency(amount)}</span></p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">5</span>
                                    <p className="ml-4 text-gray-700">Recibirás tus boletos por email una vez confirmado el pago</p>
                                </li>
                            </ol>
                        </div>

                        {/* Important Notes */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">📌 Notas importantes:</h4>
                            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                <li>El monto debe ser exacto, de lo contrario el pago no será procesado</li>
                                <li>Las transferencias SPEI son procesadas inmediatamente 24/7</li>
                                <li>Revisa tu bandeja de entrada y spam después de realizar el pago</li>
                                <li>Si no recibes tus boletos en 1 hora, contáctanos</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <Link
                        to="/"
                        className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold text-center hover:bg-gray-300 transition-colors"
                    >
                        Volver al Inicio
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        🖨️ Imprimir Instrucciones
                    </button>
                </div>

                {/* Support */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>¿Necesitas ayuda? Contáctanos a <a href="mailto:soporte@monotickets.com" className="text-blue-600 hover:underline">soporte@monotickets.com</a></p>
                </div>
            </div>
        </div>
    );
}
