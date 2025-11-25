import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { components as ApiComponents } from '@monomarket/contracts';

type ApiOrder = ApiComponents['schemas']['Order'] & {
    buyer?: ApiComponents['schemas']['Buyer'];
};

export function OrganizerSalesPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!eventId) return;
        loadOrders(eventId);
    }, [eventId]);

    const loadOrders = async (id: string) => {
        try {
            setLoading(true);
            setError('');
            const response = await apiClient.getOrganizerEventOrders(id);
            setOrders(response || []);
        } catch (err: any) {
            setError(err.message || 'No se pudieron cargar las ventas.');
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = useMemo(() => {
        return orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    }, [orders]);

    const uniqueBuyers = useMemo(() => {
        const map = new Map<string, ApiOrder['buyer']>();
        orders.forEach((order) => {
            if (order.buyer?.email) {
                map.set(order.buyer.email, order.buyer);
            }
        });
        return Array.from(map.values());
    }, [orders]);

    const resendTickets = async (orderId?: string) => {
        if (!orderId) return;
        try {
            await apiClient.resendOrganizerTickets(orderId);
            setSuccessMessage('Boletos reenviados correctamente.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message || 'No se pudo reenviar el correo.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 uppercase">Ventas del evento</p>
                        <h1 className="text-2xl font-bold text-gray-900">Resumen de ventas</h1>
                    </div>
                    <button
                        onClick={() => navigate('/organizer/events')}
                        className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                    >
                        Volver a eventos
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}
                {successMessage && (
                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">{successMessage}</div>
                )}

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow p-6">
                        <p className="text-sm text-gray-500">Órdenes</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6">
                        <p className="text-sm text-gray-500">Ingresos</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                            ${totalRevenue.toLocaleString('es-MX')} MXN
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6">
                        <p className="text-sm text-gray-500">Compradores Aï¿½nicos</p>
                        <p className="text-3xl font-bold text-blue-600 mt-2">{uniqueBuyers.length}</p>
                    </div>
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Órdenes recientes</h2>

                    {loading ? (
                        <div className="py-12 text-center text-gray-500">Cargando ventas...</div>
                    ) : orders.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">Aï¿½n no hay ventas registradas.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Orden</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Comprador</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-4 py-4 text-sm text-gray-900 font-mono">{order.id}</td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm font-medium text-gray-900">{order.buyer?.name || 'Sin nombre'}</p>
                                                <p className="text-sm text-gray-500">{order.buyer?.email}</p>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-900 font-semibold">
                                                ${Number(order.total || 0).toLocaleString('es-MX')} {order.currency || 'MXN'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-100"
                                                    onClick={() => resendTickets(order.id)}
                                                >
                                                    Reenviar boletos
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Compradores</h2>
                    {uniqueBuyers.length === 0 ? (
                        <p className="text-gray-500">Sin compradores registrados.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {uniqueBuyers.map((buyer) => (
                                <div key={buyer?.email} className="border rounded-xl p-4">
                                    <p className="font-semibold text-gray-900">{buyer?.name}</p>
                                    <p className="text-sm text-gray-500">{buyer?.email}</p>
                                    <p className="text-sm text-gray-500">{buyer?.phone}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
