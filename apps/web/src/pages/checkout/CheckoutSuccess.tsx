import { useLocation, useNavigate } from 'react-router-dom';

function useQuery() {
    const { search } = useLocation();
    return new URLSearchParams(search);
}

export function CheckoutSuccess() {
    const query = useQuery();
    const navigate = useNavigate();

    const orderId = query.get('orderId');
    const status = query.get('status');

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22a10 10 0 100-20 10 10 0 000 20z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Compra completada</h2>
                <p className="text-gray-600 mb-6">
                    {status === 'in_review'
                        ? 'Estamos revisando tu pago. Te avisaremos por correo en cuanto se confirme.'
                        : 'Tu pago fue aprobado. Recibirás tus boletos en minutos.'}
                </p>
                {orderId && (
                    <div className="bg-gray-50 rounded-xl p-6 text-left space-y-2 mb-8">
                        <p className="text-sm text-gray-500">Número de orden</p>
                        <p className="font-mono text-gray-900 text-lg break-all">{orderId}</p>
                    </div>
                )}
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                    Volver al inicio
                </button>
            </div>
        </div>
    );
}
