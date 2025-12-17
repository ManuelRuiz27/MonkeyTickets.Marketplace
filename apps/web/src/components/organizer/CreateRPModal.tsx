import { useState } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../../hooks/useToast';

interface CreateRPModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    onSuccess: () => void;
}

export function CreateRPModal({ isOpen, onClose, eventId, onSuccess }: CreateRPModalProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        maxTickets: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data: any = {
                name: form.name,
                email: form.email,
            };

            if (form.phone) data.phone = form.phone;
            if (form.maxTickets) data.maxTickets = parseInt(form.maxTickets);

            const result = await apiClient.createRP(eventId, data);

            toast.success(`✅ RP creado: ${result.code}`);
            setForm({ name: '', email: '', phone: '', maxTickets: '' });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Error al crear RP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Registrar Nuevo RP"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} loading={loading} disabled={!form.name || !form.email}>
                        Crear RP
                    </Button>
                </>
            }
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del RP *
                    </label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Carlos Promotor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                    </label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="carlos@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+52 123 456 7890"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Límite de Boletos (opcional)
                    </label>
                    <input
                        type="number"
                        value={form.maxTickets}
                        onChange={(e) => setForm({ ...form, maxTickets: e.target.value })}
                        placeholder="100"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Dejar vacío para permitir boletos ilimitados
                    </p>
                </div>
            </form>
        </Modal>
    );
}
