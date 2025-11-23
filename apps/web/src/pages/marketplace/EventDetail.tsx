import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export function EventDetail() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (eventId) {
            apiClient.getEventById(eventId)
                .then(setEvent)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [eventId]);

    const handleBuy = () => {
        if (!selectedTemplate) return;
        navigate(`/checkout/${eventId}`, {
            state: {
                templateId: selectedTemplate,
                quantity,
                eventTitle: event.title,
                templateName: event.templates.find((t: any) => t.id === selectedTemplate)?.name,
                price: event.templates.find((t: any) => t.id === selectedTemplate)?.price
            }
        });
    };

    if (loading) return <div className="p-8 text-center">Cargando evento...</div>;
    if (!event) return <div className="p-8 text-center">Evento no encontrado</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Hero Section */}
            <div className="h-96 w-full relative">
                <img
                    src={event.coverImage || 'https://via.placeholder.com/1200x400'}
                    alt={event.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end">
                    <div className="container mx-auto px-4 pb-8 text-white">
                        <span className="bg-primary-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4 inline-block">
                            {event.category}
                        </span>
                        <h1 className="text-5xl font-bold mb-2">{event.title}</h1>
                        <p className="text-xl opacity-90 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.venue}, {event.city}
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-8 rounded-xl shadow-sm">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900">Acerca del evento</h2>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                            {event.description}
                        </p>
                    </div>
                </div>

                {/* Sidebar - Tickets */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-lg sticky top-8 border border-gray-100">
                        <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                            Boletos Disponibles
                        </h3>

                        <div className="space-y-4 mb-8">
                            {event.templates?.map((template: any) => (
                                <div
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTemplate === template.id
                                        ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-900">{template.name}</span>
                                        <span className="font-bold text-primary-700 text-lg">
                                            ${Number(template.price).toLocaleString()} {template.currency}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                                    <div className="text-xs font-medium text-gray-400">
                                        {template.quantity} disponibles
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedTemplate && (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cantidad
                                    </label>
                                    <select
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                            <option key={n} value={n}>{n} boleto{n > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center mb-4 text-lg font-bold">
                                        <span>Total</span>
                                        <span>
                                            ${(Number(event.templates.find((t: any) => t.id === selectedTemplate)?.price) * quantity).toLocaleString()} MXN
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleBuy}
                                        className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    >
                                        Comprar Ahora
                                    </button>
                                </div>
                            </div>
                        )}

                        {!selectedTemplate && (
                            <p className="text-center text-gray-500 text-sm italic">
                                Selecciona un tipo de boleto para continuar
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
