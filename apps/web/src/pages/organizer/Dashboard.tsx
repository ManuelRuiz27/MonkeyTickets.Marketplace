import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export function OrganizerDashboard() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const data = await apiClient.getOrganizerEvents();
            setEvents(data);
        } catch (err) {
            setError('Error al cargar los eventos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white shadow">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Panel de Organizador</h1>
                    <button
                        onClick={() => {
                            localStorage.removeItem('authToken');
                            navigate('/organizer/login');
                        }}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total de Eventos</h3>
                        <p className="text-4xl font-bold mt-2 text-primary-600">{events.length}</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Boletos Vendidos</h3>
                        <p className="text-4xl font-bold mt-2 text-green-600">
                            {events.reduce((acc, event) => acc + (event.templates?.reduce((tAcc: number, t: any) => tAcc + (t.sold || 0), 0) || 0), 0)}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Ingresos Totales</h3>
                        <p className="text-4xl font-bold mt-2 text-blue-600">
                            ${events.reduce((acc, event) => acc + (event.templates?.reduce((tAcc: number, t: any) => tAcc + ((t.sold || 0) * Number(t.price)), 0) || 0), 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold text-gray-900">Tus Eventos</h2>
                        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                            Crear Nuevo Evento
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">Cargando eventos...</div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-600">{error}</div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-lg">Aún no tienes eventos. ¡Crea tu primer evento!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {events.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0">
                                                        <img className="h-10 w-10 rounded-full object-cover" src={event.coverImage} alt="" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                                        <div className="text-sm text-gray-500">{event.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{new Date(event.startDate).toLocaleDateString()}</div>
                                                <div className="text-sm text-gray-500">{new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{event.venue}</div>
                                                <div className="text-sm text-gray-500">{event.city}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {event.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => navigate(`/organizer/events/${event.id}/pdf-template`)}
                                                    className="text-primary-600 hover:text-primary-900 mr-4"
                                                >
                                                    Editar Plantilla
                                                </button>
                                                <button className="text-gray-600 hover:text-gray-900">
                                                    Detalles
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
