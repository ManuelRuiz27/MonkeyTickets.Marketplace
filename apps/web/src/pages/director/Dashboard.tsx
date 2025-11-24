import { useEffect, useState } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line,
} from 'recharts';
import { apiClient } from '../../api/client';

export function DirectorDashboardPage() {
    const [range, setRange] = useState<{ from?: string; to?: string }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [overview, setOverview] = useState({
        totalGrossSales: 0,
        platformRevenue: 0,
        totalTicketsSold: 0,
        activeEvents: 0,
        activeOrganizers: 0,
    });
    const [topOrganizers, setTopOrganizers] = useState<
        { organizerId: string; businessName: string; totalRevenue: number; ticketsSold: number }[]
    >([]);
    const [topEvents, setTopEvents] = useState<
        { eventId: string; title: string; organizerName: string | null; totalRevenue: number; ticketsSold: number }[]
    >([]);

    useEffect(() => {
        loadMetrics();
    }, [range.from, range.to]);

    const loadMetrics = async () => {
        try {
            setLoading(true);
            setError('');
            const query = {
                from: range.from,
                to: range.to,
            };
            const [overviewData, organizersData, eventsData] = await Promise.all([
                apiClient.getDirectorOverview(query),
                apiClient.getDirectorTopOrganizers({ ...query, limit: 6 }),
                apiClient.getDirectorTopEvents({ ...query, limit: 6 }),
            ]);
            setOverview(overviewData);
            setTopOrganizers(organizersData || []);
            setTopEvents(
                (eventsData || []).map((event) => ({
                    ...event,
                    organizerName: event.organizerName ?? 'Sin organizador',
                })),
            );
        } catch (err: any) {
            setError(err.message || 'No se pudieron cargar las mActricas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-4xl font-bold">Panel de Director</h1>
                    <p className="text-purple-100 mt-2">VisiA3n general de la plataforma</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                <section className="bg-white rounded-2xl shadow p-6 flex flex-wrap items-center gap-4 justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Filtrar por rango de fechas</p>
                        <p className="text-sm text-gray-400">Opcional - aplica sobre ventas y KPIs</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <label className="text-sm text-gray-600 flex flex-col">
                            Desde
                            <input
                                type="date"
                                value={range.from || ''}
                                onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
                                className="mt-1 rounded-lg border px-3 py-2"
                            />
                        </label>
                        <label className="text-sm text-gray-600 flex flex-col">
                            Hasta
                            <input
                                type="date"
                                value={range.to || ''}
                                onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
                                className="mt-1 rounded-lg border px-3 py-2"
                            />
                        </label>
                        <button
                            onClick={() => setRange({})}
                            className="self-end px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                        >
                            Limpiar
                        </button>
                    </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                        <p className="text-sm text-gray-500">Ventas brutas</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            ${overview.totalGrossSales.toLocaleString('es-MX')} MXN
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500">Ingresos de la plataforma</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            ${overview.platformRevenue.toLocaleString('es-MX')} MXN
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">Boletos vendidos</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalTicketsSold}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500">
                        <p className="text-sm text-gray-500">Eventos activos</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{overview.activeEvents}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow border-l-4 border-pink-500">
                        <p className="text-sm text-gray-500">Organizadores activos</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{overview.activeOrganizers}</p>
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Top organizadores</h2>
                                <p className="text-sm text-gray-500">Ingresos acumulados</p>
                            </div>
                        </div>
                        {loading ? (
                            <p className="text-center text-gray-500 py-6">Cargando...</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topOrganizers} margin={{ top: 16, right: 16, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="businessName" hide />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="totalRevenue" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                        <ul className="mt-4 space-y-2">
                            {topOrganizers.map((organizer) => (
                                <li key={organizer.organizerId} className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">{organizer.businessName}</span>
                                    <span className="text-sm text-gray-500">
                                        ${organizer.totalRevenue.toLocaleString('es-MX')} MXN
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white rounded-2xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Top eventos</h2>
                                <p className="text-sm text-gray-500">Boletos vendidos</p>
                            </div>
                        </div>
                        {loading ? (
                            <p className="text-center text-gray-500 py-6">Cargando...</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={topEvents} margin={{ top: 16, right: 16, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="title" hide />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="ticketsSold" stroke="#2563eb" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                        <ul className="mt-4 space-y-2">
                            {topEvents.map((event) => (
                                <li key={event.eventId} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{event.title}</p>
                                        <p className="text-xs text-gray-500">{event.organizerName}</p>
                                    </div>
                                    <span className="text-sm text-gray-500">{event.ticketsSold} boletos</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </main>
        </div>
    );
}
