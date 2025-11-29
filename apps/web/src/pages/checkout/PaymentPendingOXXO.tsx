import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';

export function PaymentPendingOXXO() {
    const { orderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [imageLoaded, setImageLoaded] = useState(false);

    const { reference, barcodeUrl, amount, expiresAt } = location.state || {};

    useEffect(() => {
        if (!location.state) {
            navigate('/');
        }
    }, [location.state, navigate]);

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
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">¡Pedido Registrado!</h1>
                    <p className="mt-2 text-gray-600">
                        Orden #{orderId?.slice(0, 8)}
                    </p>
                </div>

                {/* OXXO Instructions Card */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                        <h2 className="text-xl font-semibold text-white flex items-center">
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Instrucciones de Pago OXXO
                        </h2>
                    </div>

                    <div className="px-6 py-6 space-y-6">
                        {/* Amount */}
                        <div className="bg-red-50 border-l-4 border-red-600 p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-red-900">Monto a pagar en OXXO:</span>
                                <span className="text-2xl font-bold text-red-900">{formatCurrency(amount)}</span>
                            </div>
                        </div>

                        {/* Barcode */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white">
                            <p className="text-sm font-medium text-gray-700 mb-4">Código de Barras</p>
                            {barcodeUrl && (
                                <div className="flex justify-center mb-4">
                                    <img
                                        src={barcodeUrl}
                                        alt="Código de barras OXXO"
                                        className={`max-w-full h-auto transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                        onLoad={() => setImageLoaded(true)}
                                        style={{ maxHeight: '120px' }}
                                    />
                                    {!imageLoaded && (
                                        <div className="flex items-center justify-center h-24">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                                {reference}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Muestra este código de barras en la tienda OXXO
                            </p>
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
                                    <span className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                                    <p className="ml-4 text-gray-700">Acude a cualquier tienda OXXO</p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                                    <p className="ml-4 text-gray-700">Muestra el código de barras impreso o desde tu celular al cajero</p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                                    <p className="ml-4 text-gray-700">Indica que es un pago de <span className="font-bold">"OXXO Pay"</span></p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                                    <p className="ml-4 text-gray-700">Paga exactamente <span className="font-bold">{formatCurrency(amount)}</span> en efectivo</p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">5</span>
                                    <p className="ml-4 text-gray-700">Guarda tu comprobante de pago</p>
                                </li>
                                <li className="flex">
                                    <span className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">6</span>
                                    <p className="ml-4 text-gray-700">Recibirás tus boletos por email una vez confirmado el pago</p>
                                </li>
                            </ol>
                        </div>

                        {/* Important Notes */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">📌 Notas importantes:</h4>
                            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                <li>El monto a pagar debe ser exacto</li>
                                <li>El cajero escaneará el código de barras directamente</li>
                                <li>El pago se procesa en 24-48 horas máximo</li>
                                <li>Revisa tu bandeja de entrada y spam después del pago</li>
                                <li>Si no recibes tus boletos en 48 horas, contáctanos</li>
                            </ul>
                        </div>

                        {/* OXXO Logo Info */}
                        <div className="text-center py-4 border-t">
                            <p className="text-sm text-gray-600">
                                🏪 Encuentra la tienda OXXO más cercana en{' '}
                                <a
                                    href="https://www.google.com/maps/search/oxxo/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-600 hover:underline font-medium"
                                >
                                    Google Maps
                                </a>
                            </p>
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
                        className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                        🖨️ Imprimir Ficha
                    </button>
                </div>

                {/* Support */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>¿Necesitas ayuda? Contáctanos a <a href="mailto:soporte@monotickets.com" className="text-red-600 hover:underline">soporte@monotickets.com</a></p>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .bg-white, .bg-white * {
                        visibility: visible;
                    }
                    .bg-white {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
