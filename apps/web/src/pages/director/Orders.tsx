import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { components as ApiComponents } from '@monomarket/contracts';

type ApiOrder = ApiComponents['schemas']['Order'] & {
    buyer?: ApiComponents['schemas']['Buyer'];
    event?: ApiComponents['schemas']['Event'];
};

const ORDER_STATUSES = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];

export function DirectorOrdersPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [filters, setFilters] = useState({
        orderId: '',
        email: '',
        eventId: '',
        organizerId: '',
        status: '',
    });
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        loadOrders(pagination.page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page]);

    const loadOrders = async (page: number) => {
        try {
            setLoading(true);
            setError('');
            const response = await apiClient.searchDirectorOrders({
                ...filters,
                page,
                pageSize: pagination.pageSize,
            });
            setOrders(response.data || []);
            setPagination((prev) => ({
                ...prev,
                page: response.meta.page,
                pageSize: response.meta.pageSize,
                total: response.meta.total,
            }));
        } catch (err: any) {
            setError(err.message || 'No se pudieron cargar las Órdenes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPagination((prev) => ({ ...prev, page: 1 }));
        await loadOrders(1);
    };

    const resendTickets = async (orderId?: string) => {
        if (!orderId) return;
        try {
            await apiClient.resendDirectorTickets(orderId);
            setSuccessMessage('Boletos reenviados al comprador.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message || 'No se pudo reenviar el correo');
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.pageSize) || 1;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b shadow-sm">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-gray-900">Órdenes</h1>
                    <p className="text-gray-500">Busca y gestiona pagos realizados en la plataforma.</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}
                {successMessage && (
                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">{successMessage}</div>
                )}

                <section className="bg-white rounded-2xl shadow p-6">
                    <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Órden ID</label>
                            <input
                                type="text"
                                value={filters.orderId}
                                onChange={(e) => setFilters({ ...filters, orderId: e.target.value })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Email comprador</label>
                            <input
                                type="email"
                                value={filters.email}
                                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Estado</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            >
                                <option value="">Todos</option>
                                {ORDER_STATUSES.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Evento ID</label>
                            <input
                                type="text"
                                value={filters.eventId}
                                onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Organizador ID</label>
                            <input
                                type="text"
                                value={filters.organizerId}
                                onChange={(e) => setFilters({ ...filters, organizerId: e.target.value })}
                                className="mt-1 w-full rounded-lg border px-3 py-2"
                            />
                        </div>
                        <div className="flex items-end gap-3">
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                            >
                                Buscar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFilters({ orderId: '', email: '', eventId: '', organizerId: '', status: '' });
                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                    loadOrders(1);
                                }}
                                className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                            >
                                Limpiar
                            </button>
                        </div>
                    </form>
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Resultados</h2>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-gray-600">
                                PAgina {pagination.page} de {Math.ceil(pagination.total / pagination.pageSize) || 1}
                            </span>
                            <button
                                disabled={pagination.page >= totalPages}
                                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                                className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-center text-gray-500 py-6">Cargando Órdenes...</p>
                    ) : orders.length === 0 ? (
                        <p className="text-center text-gray-500 py-6">Sin resultados para los filtros seleccionados.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Órden</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Comprador</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Evento</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-4 py-4 text-sm font-mono text-gray-900">{order.id}</td>
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-gray-900">{order.buyer?.name}</p>
                                                <p className="text-sm text-gray-500">{order.buyer?.email}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm text-gray-900">{order.event?.title || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{order.event?.organizerId}</p>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                                ${Number(order.total || 0).toLocaleString('es-MX')} {order.currency || 'MXN'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                    {(order.status || '').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => navigate(`/director/orders/${order.id}`)}
                                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-100"
                                                >
                                                    Ver detalle
                                                </button>
                                                <button
                                                    onClick={() => resendTickets(order.id)}
                                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-100"
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
            </main>
        </div>
    );
}
