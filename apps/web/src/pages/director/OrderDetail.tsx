import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { components as ApiComponents } from '@monomarket/contracts';

type ApiOrder = ApiComponents['schemas']['Order'] & {
    buyer?: ApiComponents['schemas']['Buyer'];
    event?: ApiComponents['schemas']['Event'];
    payment?: ApiComponents['schemas']['Payment'];
    tickets?: ApiComponents['schemas']['Ticket'][];
};

export function DirectorOrderDetailPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<ApiOrder | null>(null);
    const [logs, setLogs] = useState<{ legalLogs: any[]; emailLogs: any[] }>({ legalLogs: [], emailLogs: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!orderId) return;
        loadDetail(orderId);
    }, [orderId]);

    const loadDetail = async (id: string) => {
        try {
            setLoading(true);
            const response = await apiClient.getDirectorOrder(id);
            setOrder(response.order as ApiOrder);
            setLogs(response.logs);
        } catch (err: any) {
            setError(err.message || 'No se encontrA3 la orden');
        } finally {
            setLoading(false);
        }
    };

    const resendTickets = async () => {
        if (!orderId) return;
        try {
            await apiClient.resendDirectorTickets(orderId);
            setSuccessMessage('Boletos reenviados.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message || 'No se pudo reenviar el correo');
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                Orden no encontrada
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b shadow-sm">
                <div className="container mx-auto px-4 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Orden {order.id}</h1>
                        <p className="text-gray-500">Detalles completos del pago y envA-o de boletos.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => resendTickets()}
                            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                        >
                            Reenviar boletos
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                        >
                            Volver
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}
                {successMessage && (
                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">{successMessage}</div>
                )}

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow p-6 space-y-2">
                        <h2 className="text-lg font-semibold text-gray-900">Evento</h2>
                        <p className="text-sm text-gray-700">{order.event?.title}</p>
                        <p className="text-sm text-gray-500">{order.event?.organizerId}</p>
                        <p className="text-sm text-gray-500">Fecha: {order.event?.startDate ? new Date(order.event.startDate).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow p-6 space-y-2">
                        <h2 className="text-lg font-semibold text-gray-900">Comprador</h2>
                        <p className="text-sm text-gray-700">{order.buyer?.name}</p>
                        <p className="text-sm text-gray-500">{order.buyer?.email}</p>
                        <p className="text-sm text-gray-500">{order.buyer?.phone}</p>
                    </div>
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Pago</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <p>Total: <span className="font-semibold text-gray-900">${Number(order.total || 0).toLocaleString('es-MX')} {order.currency || 'MXN'}</span></p>
                        <p>Estado: <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{order.status}</span></p>
                        <p>Pago: {order.payment?.gateway}</p>
                        <p>Referencia: {order.payment?.paymentMethod}</p>
                        <p>Creado: {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</p>
                        <p>
                            Pagado:{' '}
                            {(order.payment?.status || '').toString().toUpperCase() === 'COMPLETED' && order.paidAt
                                ? new Date(order.paidAt).toLocaleString()
                                : 'Pendiente'}
                        </p>
                    </div>
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Boletos</h2>
                    {(!order.tickets || order.tickets.length === 0) ? (
                        <p className="text-gray-500">A�n no se han generado boletos para esta orden.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ticket</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Template</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {order.tickets?.map((ticket) => (
                                        <tr key={ticket?.id}>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-900">{ticket?.qrCode}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{ticket?.templateId}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{ticket?.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Logs</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Legal</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                {logs.legalLogs.length === 0 && <li>No hay registros.</li>}
                                {logs.legalLogs.map((log) => (
                                    <li key={log.id} className="border rounded-lg px-3 py-2">
                                        <p className="font-medium">{log.action}</p>
                                        <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                                        {log.metadata && (
                                            <pre className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Correos</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                {logs.emailLogs.length === 0 && <li>No hay registros.</li>}
                                {logs.emailLogs.map((log) => (
                                    <li key={log.id} className="border rounded-lg px-3 py-2">
                                        <p className="font-medium">{log.subject}</p>
                                        <p className="text-xs text-gray-500">{log.to} • {log.status}</p>
                                        <p className="text-xs text-gray-400">{log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Pendiente'}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
