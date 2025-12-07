import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

type WebhookLog = {
    id: string;
    gateway: string;
    event: string;
    verified: boolean;
    orderId?: string | null;
    createdAt: string;
};

type LegalLog = {
    id: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    ipAddress?: string | null;
    createdAt: string;
};

export function DirectorLogsPage() {
    const [gatewayFilter, setGatewayFilter] = useState<string>('');
    const [actionFilter, setActionFilter] = useState<string>('PAYMENT_WEBHOOK');
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [legalLogs, setLegalLogs] = useState<LegalLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        void loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            setError('');
            const [webhooks, legal] = await Promise.all([
                apiClient.getDirectorWebhookLogs({
                    gateway: gatewayFilter || undefined,
                    limit: 50,
                }),
                apiClient.getDirectorLegalLogs({
                    action: actionFilter || undefined,
                    limit: 50,
                }),
            ]);
            setWebhookLogs(webhooks || []);
            setLegalLogs(legal || []);
        } catch (err: any) {
            setError(err.message || 'No se pudieron cargar los logs');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b shadow-sm">
                <div className="container mx-auto px-4 py-6 flex items-baseline justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Logs de operación</h1>
                        <p className="text-gray-500 text-sm">
                            Webhooks y trazas legales para depurar pagos sin entrar a la base de datos.
                        </p>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                <section className="bg-white rounded-2xl shadow p-6 space-y-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Gateway</label>
                            <select
                                value={gatewayFilter}
                                onChange={(e) => setGatewayFilter(e.target.value)}
                                className="mt-1 rounded-lg border px-3 py-2 text-sm"
                            >
                                <option value="">Todos</option>
                                <option value="mercadopago">Mercado Pago</option>
                                <option value="openpay">Openpay</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Acción legal</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="mt-1 rounded-lg border px-3 py-2 text-sm"
                            >
                                <option value="">Todas</option>
                                <option value="PAYMENT_WEBHOOK">PAYMENT_WEBHOOK</option>
                                <option value="MP_WEBHOOK_IGNORED">MP_WEBHOOK_IGNORED</option>
                                <option value="PAYMENT_WEBHOOK_NOT_FOUND">PAYMENT_WEBHOOK_NOT_FOUND</option>
                            </select>
                        </div>
                        <button
                            onClick={loadLogs}
                            disabled={loading}
                            className="ml-auto px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Actualizando…' : 'Actualizar'}
                        </button>
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Webhooks recientes</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Últimos 50 registros en <code className="font-mono">webhook_logs</code>.
                        </p>

                        {webhookLogs.length === 0 ? (
                            <p className="text-sm text-gray-500">Sin registros para los filtros seleccionados.</p>
                        ) : (
                            <div className="overflow-x-auto max-h-[480px]">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Fecha</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Gateway</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Evento</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Orden</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Firma</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {webhookLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {new Date(log.createdAt).toLocaleString('es-MX')}
                                                </td>
                                                <td className="px-3 py-2 uppercase text-gray-700">{log.gateway}</td>
                                                <td className="px-3 py-2 text-gray-700">{log.event}</td>
                                                <td className="px-3 py-2 font-mono text-gray-700">
                                                    {log.orderId || '-'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.verified
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-yellow-50 text-yellow-700'
                                                        }`}
                                                    >
                                                        {log.verified ? 'Verificada' : 'No verificada'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Legal logs recientes</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Últimos 50 registros en <code className="font-mono">legal_logs</code>.
                        </p>

                        {legalLogs.length === 0 ? (
                            <p className="text-sm text-gray-500">Sin registros para los filtros seleccionados.</p>
                        ) : (
                            <div className="overflow-x-auto max-h-[480px]">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Fecha</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Acción</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Entidad</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">ID Entidad</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">IP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {legalLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {new Date(log.createdAt).toLocaleString('es-MX')}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700">{log.action}</td>
                                                <td className="px-3 py-2 text-gray-700">{log.entity}</td>
                                                <td className="px-3 py-2 font-mono text-gray-700">
                                                    {log.entityId || '-'}
                                                </td>
                                                <td className="px-3 py-2 text-gray-500">
                                                    {log.ipAddress || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

