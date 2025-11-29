import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { EventFiltersComponent, EventFilters } from '../../components/marketplace/EventFilters';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

export function EventList() {
    const [events, setEvents] = useState<any[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<EventFilters>({});

    useEffect(() => {
        apiClient
            .getEvents()
            .then((data: any) => {
                const eventsList = data.data || data;
                setEvents(eventsList);
                setFilteredEvents(eventsList);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error al cargar eventos:', error);
                setLoading(false);
            });
    }, []);

    // Apply filters whenever they change
    useEffect(() => {
        if (!events.length) {
            setFilteredEvents([]);
            return;
        }

        let result = [...events];

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter((event) =>
                event.title?.toLowerCase().includes(searchLower) ||
                event.description?.toLowerCase().includes(searchLower) ||
                event.venue?.toLowerCase().includes(searchLower)
            );
        }

        // Category filter
        if (filters.category) {
            result = result.filter((event) => event.category === filters.category);
        }

        // City filter
        if (filters.city) {
            result = result.filter((event) => event.city === filters.city);
        }

        // Price range filter
        if (filters.minPrice !== undefined) {
            result = result.filter((event) => (event.price || 0) >= filters.minPrice!);
        }
        if (filters.maxPrice !== undefined) {
            result = result.filter((event) => (event.price || 0) <= filters.maxPrice!);
        }

        // Date range filter
        if (filters.startDate) {
            result = result.filter((event) =>
                new Date(event.startDate) >= new Date(filters.startDate!)
            );
        }
        if (filters.endDate) {
            result = result.filter((event) =>
                new Date(event.startDate) <= new Date(filters.endDate!)
            );
        }

        // Sort
        if (filters.sortBy === 'price') {
            result.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (filters.sortBy === 'name') {
            result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else {
            // Default: sort by date
            result.sort((a, b) =>
                new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            );
        }

        setFilteredEvents(result);
    }, [filters, events]);

    const handleFilterChange = (newFilters: EventFilters) => {
        setFilters(newFilters);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-xl text-gray-700">Cargando eventos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl">
                        <h1 className="text-5xl font-bold mb-4">
                            Descubre Eventos Increíbles
                        </h1>
                        <p className="text-xl text-primary-100">
                            Los mejores conciertos, festivales y experiencias en México
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="container mx-auto px-4 py-8">
                <EventFiltersComponent onFilterChange={handleFilterChange} loading={false} />
            </div>

            {/* Events Grid */}
            <div className="container mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">
                        Próximos Eventos
                    </h2>
                    <div className="text-sm text-gray-600">
                        {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} disponible{filteredEvents.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredEvents.map((event) => (
                            <Link
                                key={event.id}
                                to={`/events/${event.id}`}
                                className="group"
                            >
                                <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                                    {event.coverImage ? (
                                        <div className="relative h-56 overflow-hidden">
                                            <img
                                                src={event.coverImage}
                                                alt={event.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                                <div className="bg-white px-3 py-1 rounded-full text-sm font-semibold text-primary-600">
                                                    {event.category || 'Evento'}
                                                </div>
                                                {(event.isUnlisted || !event.isPublic) && (
                                                    <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-300">
                                                        🔒 Oculto
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-56 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                            <svg
                                                className="w-20 h-20 text-white opacity-50"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                                                />
                                            </svg>
                                        </div>
                                    )}

                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                                            {event.title}
                                        </h3>

                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                            {event.description || 'Sin descripción disponible'}
                                        </p>

                                        <div className="space-y-2">
                                            {event.venue && (
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {event.venue}
                                                </div>
                                            )}

                                            {event.city && (
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    {event.city}
                                                </div>
                                            )}

                                            {event.startDate && (
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {new Date(event.startDate).toLocaleDateString('es-MX', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Precio desde */}
                                        {event.templates && event.templates.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <div className="flex items-baseline">
                                                    <span className="text-sm text-gray-500 mr-2">Desde</span>
                                                    <span className="text-2xl font-bold text-primary-700">
                                                        ${Math.min(...event.templates.map((t: any) => Number(t.price))).toLocaleString()}
                                                    </span>
                                                    <span className="text-sm text-gray-500 ml-1">MXN</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-6">
                                            <button className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center group-hover:shadow-lg">
                                                Ver Detalles
                                                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <svg
                            className="w-24 h-24 mx-auto text-gray-300 mb-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                        <p className="text-2xl text-gray-400 font-medium">
                            No hay eventos disponibles en este momento
                        </p>
                        <p className="text-gray-400 mt-2">
                            Vuelve pronto para descubrir nuevas experiencias
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
