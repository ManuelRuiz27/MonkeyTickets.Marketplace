import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';

export function RPTicketGeneratorPage() {
    const { rpCode } = useParams<{ rpCode: string }>();
    const [rpInfo, setRpInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [generating, setGenerating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        loadRPInfo();
    }, [rpCode]);

    const loadRPInfo = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getRPInfo(rpCode!);
            setRpInfo(data);

            if (!data.rp.isActive) {
                setError('Este código de RP no está activo. Contacta al organizador.');
            }

            if (data.rp.maxTickets && data.rp.ticketsGenerated >= data.rp.maxTickets) {
                setError(`Este RP ha alcanzado su límite de ${data.rp.maxTickets} boletos.`);
            }
        } catch (error: any) {
            setError(error.message || 'Código de RP inválido');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        setError('');

        try {
            const blob = await apiClient.generateRPTicket(rpCode!, {
                name: form.name,
                email: form.email,
                phone: form.phone || undefined,
            });

            // Descargar PDF
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ticket-${rpCode}-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setSuccess(true);
            setForm({ name: '', email: '', phone: '' });

            // Recargar info para actualizar contador
            setTimeout(() => {
                loadRPInfo();
                setSuccess(false);
            }, 3000);
        } catch (error: any) {
            setError(error.message || 'Error al generar boleto');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="text-lg text-gray-600">Cargando...</div>
                </div>
            </div>
        );
    }

    if (error && !rpInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
                    <div className="text-center">
                        <div className="text-6xl mb-4">❌</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
                        <p className="text-gray-600">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    const { rp, event } = rpInfo;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-lg shadow-xl p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            🎉 {event.title}
                        </h1>
                        <p className="text-gray-600">
                            Invitación de <span className="font-semibold text-indigo-600">{rp.name}</span>
                        </p>
                    </div>

                    {event.coverImage && (
                        <div className="mb-6 rounded-lg overflow-hidden">
                            <img
                                src={event.coverImage}
                                alt={event.title}
                                className="w-full h-48 object-cover"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-gray-600 mb-1">📅 Fecha</div>
                            <div className="font-semibold">
                                {new Date(event.startDate).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-gray-600 mb-1">🕐 Hora</div>
                            <div className="font-semibold">
                                {new Date(event.startDate).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>
                        {event.venue && (
                            <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                                <div className="text-gray-600 mb-1">📍 Lugar</div>
                                <div className="font-semibold">{event.venue}</div>
                                {event.address && (
                                    <div className="text-sm text-gray-500">{event.address}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Progress Indicator */}
                    {rp.maxTickets && (
                        <div className="mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Boletos generados</span>
                                <span className="font-semibold">
                                    {rp.ticketsGenerated} / {rp.maxTickets}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min((rp.ticketsGenerated / rp.maxTickets) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Form */}
                <div className="bg-white rounded-b-lg shadow-xl p-8">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">✅</div>
                            <h2 className="text-2xl font-bold text-green-600 mb-2">
                                ¡Boleto Generado!
                            </h2>
                            <p className="text-gray-600">
                                Tu boleto se ha descargado automáticamente. Revisa tu carpeta de descargas.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                                Obtén tu Boleto Gratis
                            </h2>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre Completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Juan Pérez"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="juan@ejemplo.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Teléfono (opcional)
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="+52 123 456 7890"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-4 text-lg"
                                    disabled={generating || !form.name || !form.email}
                                    isLoading={generating}
                                >
                                    {generating ? 'Generando Boleto...' : '🎟️ Generar Mi Boleto'}
                                </Button>
                            </form>

                            <p className="text-xs text-gray-500 text-center mt-6">
                                Al generar tu boleto, recibirás un PDF con un código QR único para ingresar al evento.
                                Guárdalo en tu celular.
                            </p>
                        </>
                    )}
                </div>

                {/* Powered by */}
                <div className="text-center mt-8 text-white text-sm">
                    <p>Cortesía de {rp.name}</p>
                    <p className="text-xs opacity-75 mt-1">Powered by MonoMarket</p>
                </div>
            </div>
        </div>
    );
}
