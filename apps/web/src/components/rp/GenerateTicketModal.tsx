import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

interface GenerateTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function GenerateTicketModal({ isOpen, onClose, onSuccess }: GenerateTicketModalProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [guestTypes, setGuestTypes] = useState<any[]>([]);
    const [form, setForm] = useState({
        guestTypeId: '',
        guestNickname: '',
        quantity: 1,
    });

    useEffect(() => {
        if (isOpen) {
            loadGuestTypes();
        }
    }, [isOpen]);

    const loadGuestTypes = async () => {
        try {
            const types: any = await apiClient.getAvailableGuestTypes();
            setGuestTypes(types);
            if (types.length > 0) {
                setForm(prev => ({ ...prev, guestTypeId: types[0].id }));
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar tipos');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await apiClient.generateGuestTicket({
                guestTypeId: form.guestTypeId,
                guestNickname: form.guestNickname || undefined,
                quantity: form.quantity,
            });

            toast.success(`✅ ${form.quantity} ticket(s) generado(s)`);
            setForm({ guestTypeId: guestTypes[0]?.id || '', guestNickname: '', quantity: 1 });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Error al generar ticket');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedType = guestTypes.find(t => t.id === form.guestTypeId);
    const showNickname = selectedType?.showNicknameOnPdf;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Generar Ticket</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de Invitado *
                        </label>
                        <select
                            value={form.guestTypeId}
                            onChange={(e) => setForm({ ...form, guestTypeId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            required
                        >
                            {guestTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.icon} {type.name}
                                </option>
                            ))}
                        </select>
                        {selectedType && (
                            <div
                                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
                                style={{ backgroundColor: selectedType.color || '#6366F1' }}
                            >
                                {selectedType.icon} {selectedType.name}
                            </div>
                        )}
                    </div>

                    {showNickname && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Apodo del Invitado
                            </label>
                            <input
                                type="text"
                                value={form.guestNickname}
                                onChange={(e) => setForm({ ...form, guestNickname: e.target.value })}
                                placeholder="El Padrino"
                                maxLength={50}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Se mostrará en el PDF del boleto
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad
                        </label>
                        <input
                            type="number"
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                            min="1"
                            max="10"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Máximo 10 tickets por generación
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            isLoading={loading}
                            disabled={!form.guestTypeId}
                            className="flex-1"
                        >
                            Generar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
