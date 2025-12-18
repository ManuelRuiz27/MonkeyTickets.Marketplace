import { useState } from 'react';
import { apiClient } from '../../api/client';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../../hooks/useToast';

interface CreateGuestTypeModalProps {
    open: boolean;
    onClose: () => void;
    eventId: string;
    onSuccess: () => void;
}

export function CreateGuestTypeModal({ open, onClose, eventId, onSuccess }: CreateGuestTypeModalProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        color: '#6366F1',
        icon: '🎟️',
        showNicknameOnPdf: true,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await apiClient.createGuestType(eventId, {
                name: form.name,
                description: form.description || undefined,
                color: form.color,
                icon: form.icon,
                showNicknameOnPdf: form.showNicknameOnPdf,
            });

            toast.success(`✅ Tipo "${form.name}" creado`);
            setForm({ name: '', description: '', color: '#6366F1', icon: '🎟️', showNicknameOnPdf: true });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Error al crear tipo de invitado');
        } finally {
            setLoading(false);
        }
    };

    const colorPresets = [
        { name: 'Indigo', value: '#6366F1' },
        { name: 'Gold', value: '#FFD700' },
        { name: 'Pink', value: '#FF69B4' },
        { name: 'Green', value: '#10B981' },
        { name: 'Purple', value: '#9333EA' },
        { name: 'Red', value: '#EF4444' },
    ];

    const iconPresets = ['🎟️', '🌟', '👑', '💎', '📸', '🎭', '🎪', '🎨'];

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Crear Tipo de Invitado"
            actions={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} isLoading={loading} disabled={!form.name.trim()}>
                        Crear Tipo
                    </Button>
                </>
            }
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre *
                    </label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="VIP"
                        maxLength={50}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                    </label>
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Personas VIP con acceso especial"
                        maxLength={200}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color *
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={form.color}
                            onChange={(e) => setForm({ ...form, color: e.target.value })}
                            className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                        />
                        <div
                            className="px-4 py-2 rounded-lg text-white font-medium"
                            style={{ backgroundColor: form.color }}
                        >
                            {form.icon} {form.name || 'Preview'}
                        </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                        {colorPresets.map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => setForm({ ...form, color: preset.value })}
                                className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500"
                                style={{ backgroundColor: preset.value }}
                                title={preset.name}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icono
                    </label>
                    <div className="flex gap-2">
                        {iconPresets.map((icon) => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => setForm({ ...form, icon })}
                                className={`text-2xl w-10 h-10 rounded border-2 ${form.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                    } hover:border-blue-300`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="showNickname"
                        checked={form.showNicknameOnPdf}
                        onChange={(e) => setForm({ ...form, showNicknameOnPdf: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="showNickname" className="ml-2 block text-sm text-gray-700">
                        Mostrar apodo en PDF del boleto
                    </label>
                </div>
            </form>
        </Modal>
    );
}

