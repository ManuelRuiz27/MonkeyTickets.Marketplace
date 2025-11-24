import { ReactNode } from 'react';

interface ModalProps {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
    actions?: ReactNode;
}

export function Modal({ open, title, children, onClose, actions }: ModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Cerrar modal"
                    >
                        ✕
                    </button>
                </div>
                <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
                {actions && (
                    <div className="border-t px-6 py-3 bg-gray-50 flex justify-end gap-3">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
