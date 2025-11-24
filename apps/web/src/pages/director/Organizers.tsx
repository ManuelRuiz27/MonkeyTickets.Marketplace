import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { components as ApiComponents } from '@monomarket/contracts';
import { Modal } from '../../components/ui/Modal';

type ApiOrganizer = ApiComponents['schemas']['Organizer'] & {
    feePlan?: ApiComponents['schemas']['FeePlan'];
};
type ApiFeePlan = ApiComponents['schemas']['FeePlan'];

export function DirectorOrganizersPage() {
    const [organizers, setOrganizers] = useState<ApiOrganizer[]>([]);
    const [feePlans, setFeePlans] = useState<ApiFeePlan[]>([]);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusModal, setStatusModal] = useState<{ open: boolean; organizer?: ApiOrganizer; status?: string }>({ open: false });
    const [feePlanModal, setFeePlanModal] = useState<{ open: boolean; organizer?: ApiOrganizer; feePlanId?: string }>({ open: false });

    useEffect(() => {
        loadOrganizers(pagination.page);
        loadFeePlans();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page]);

    const loadOrganizers = async (page: number) => {
        try {
            setLoading(true);
            setError('');
            const response = await apiClient.getDirectorOrganizers({ page, pageSize: pagination.pageSize });
            setOrganizers(response.data || []);
            setPagination((prev) => ({
                ...prev,
                page: response.meta.page,
                pageSize: response.meta.pageSize,
                total: response.meta.total,
            }));
        } catch (err: any) {
            setError(err.message || 'No se pudieron cargar los organizadores');
        } finally {
            setLoading(false);
        }
    };

    const loadFeePlans = async () => {
        try {
            const response = await apiClient.getDirectorFeePlans({ page: 1, pageSize: 100 });
            setFeePlans(response.data || []);
        } catch {
            // ignore
        }
    };

    const changeStatus = async () => {
        if (!statusModal.organizer?.id || !statusModal.status) return;
        try {
            await apiClient.updateDirectorOrganizerStatus(statusModal.organizer.id, statusModal.status);
            setStatusModal({ open: false });
            await loadOrganizers(pagination.page);
        } catch (err: any) {
            setError(err.message || 'No se pudo actualizar el estado');
        }
    };

    const assignFeePlan = async () => {
        if (!feePlanModal.organizer?.id) return;
        try {
            await apiClient.updateDirectorOrganizerFeePlan(
                feePlanModal.organizer.id,
                feePlanModal.feePlanId || undefined,
            );
            setFeePlanModal({ open: false });
            await loadOrganizers(pagination.page);
        } catch (err: any) {
            setError(err.message || 'No se pudo asignar el plan');
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.pageSize) || 1;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b shadow-sm">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-gray-900">Organizadores</h1>
                    <p className="text-gray-500">Gestiona el estado y planes de comisiA3n.</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                <section className="bg-white rounded-2xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Listado</h2>
                            <p className="text-sm text-gray-500">
                                Mostrando {organizers.length} de {pagination.total}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-gray-600">
                                PAgina {pagination.page} de {totalPages}
                            </span>
                            <button
                                disabled={pagination.page >= totalPages}
                                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                                className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-center text-gray-500 py-6">Cargando organizadores...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Organizador</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plan</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {organizers.map((organizer) => (
                                        <tr key={organizer.id}>
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-gray-900">{organizer.businessName}</p>
                                                <p className="text-sm text-gray-500">{organizer.user?.email}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                    {(organizer.status || 'pending').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm text-gray-900">{organizer.feePlan?.name || 'Sin plan'}</p>
                                                {organizer.feePlan && (
                                                    <p className="text-xs text-gray-500">
                                                        {Number(organizer.feePlan.platformFeePercent || 0)}% + ${Number(organizer.feePlan.platformFeeFixed || 0)} MXN
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => setStatusModal({ open: true, organizer, status: organizer.status || 'PENDING' })}
                                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-100"
                                                >
                                                    Cambiar estado
                                                </button>
                                                <button
                                                    onClick={() => setFeePlanModal({ open: true, organizer, feePlanId: organizer.feePlanId || '' })}
                                                    className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-100"
                                                >
                                                    Asignar plan
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>

            <Modal
                open={statusModal.open}
                onClose={() => setStatusModal({ open: false })}
                title="Actualizar estado"
                actions={(
                    <>
                        <button
                            onClick={() => setStatusModal({ open: false })}
                            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={changeStatus}
                            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                            type="button"
                        >
                            Guardar
                        </button>
                    </>
                )}
            >
                <p className="text-sm text-gray-600 mb-3">
                    Selecciona el nuevo estado para <strong>{statusModal.organizer?.businessName}</strong>
                </p>
                <select
                    value={statusModal.status}
                    onChange={(e) => setStatusModal((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2"
                >
                    <option value="APPROVED">Aprobado</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="BLOCKED">Bloqueado</option>
                </select>
            </Modal>

            <Modal
                open={feePlanModal.open}
                onClose={() => setFeePlanModal({ open: false })}
                title="Asignar plan de comisiA3n"
                actions={(
                    <>
                        <button
                            onClick={() => setFeePlanModal({ open: false })}
                            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={assignFeePlan}
                            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                            type="button"
                        >
                            Guardar
                        </button>
                    </>
                )}
            >
                <p className="text-sm text-gray-600 mb-3">
                    Selecciona un plan para <strong>{feePlanModal.organizer?.businessName}</strong>
                </p>
                <select
                    value={feePlanModal.feePlanId || ''}
                    onChange={(e) => setFeePlanModal((prev) => ({ ...prev, feePlanId: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2"
                >
                    <option value="">Sin plan</option>
                    {feePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                            {plan.name} ({Number(plan.platformFeePercent || 0)}%)
                        </option>
                    ))}
                </select>
            </Modal>
        </div>
    );
}
