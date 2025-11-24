import { useEffect, useState } from 'react';
import { apiClient, FeePlanInput } from '../../api/client';
import { components as ApiComponents } from '@monomarket/contracts';
import { Modal } from '../../components/ui/Modal';

type ApiFeePlan = ApiComponents['schemas']['FeePlan'];

const emptyForm: FeePlanInput = {
    name: '',
    description: '',
    platformFeePercent: 0,
    platformFeeFixed: 0,
    paymentGatewayFeePercent: 0,
    isDefault: false,
};

export function DirectorFeePlansPage() {
    const [plans, setPlans] = useState<ApiFeePlan[]>([]);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState<{ open: boolean; planId?: string }>({ open: false });
    const [form, setForm] = useState<FeePlanInput>(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadPlans(pagination.page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page]);

    const loadPlans = async (page: number) => {
        try {
            setLoading(true);
            const response = await apiClient.getDirectorFeePlans({ page, pageSize: pagination.pageSize });
            setPlans(response.data || []);
            setPagination((prev) => ({
                ...prev,
                page: response.meta.page,
                pageSize: response.meta.pageSize,
                total: response.meta.total,
            }));
        } catch (err: any) {
            setError(err.message || 'No se pudieron cargar los planes');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (plan?: ApiFeePlan) => {
        if (plan) {
            setModal({ open: true, planId: plan.id });
            setForm({
                name: plan.name || '',
                description: plan.description || '',
                platformFeePercent: Number(plan.platformFeePercent || 0),
                platformFeeFixed: Number(plan.platformFeeFixed || 0),
                paymentGatewayFeePercent: Number(plan.paymentGatewayFeePercent || 0),
                isDefault: plan.isDefault || false,
            });
        } else {
            setModal({ open: true });
            setForm(emptyForm);
        }
    };

    const savePlan = async (e?: React.BaseSyntheticEvent) => {
        e?.preventDefault();
        setSubmitting(true);
        try {
            if (modal.planId) {
                await apiClient.updateDirectorFeePlan(modal.planId, form);
            } else {
                await apiClient.createDirectorFeePlan(form);
            }
            setModal({ open: false });
            await loadPlans(pagination.page);
        } catch (err: any) {
            setError(err.message || 'No se pudo guardar el plan');
        } finally {
            setSubmitting(false);
        }
    };

    const deletePlan = async (planId?: string) => {
        if (!planId) return;
        const confirmed = window.confirm('A�Eliminar este plan?');
        if (!confirmed) return;
        try {
            await apiClient.deleteDirectorFeePlan(planId);
            await loadPlans(pagination.page);
        } catch (err: any) {
            setError(err.message || 'No se pudo eliminar el plan');
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.pageSize) || 1;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b shadow-sm">
                <div className="container mx-auto px-4 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Planes de comisiA3n</h1>
                        <p className="text-gray-500">Configura las tarifas que aplican a los organizadores.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                    >
                        Nuevo plan
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                <section className="bg-white rounded-2xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Planes disponibles</h2>
                            <p className="text-sm text-gray-500">Activos: {plans.length}</p>
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
                        <p className="text-center text-gray-500 py-6">Cargando planes...</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {plans.map((plan) => (
                                <div key={plan.id} className="border rounded-xl p-4 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">{plan.name}</p>
                                            <p className="text-sm text-gray-500">{plan.description || 'Sin descripciA3n'}</p>
                                        </div>
                                        {plan.isDefault && (
                                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Plataforma: {Number(plan.platformFeePercent || 0)}% + ${Number(plan.platformFeeFixed || 0)} MXN
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Gateway: {Number(plan.paymentGatewayFeePercent || 0)}%
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openModal(plan)}
                                            className="flex-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-100"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => deletePlan(plan.id)}
                                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <Modal
                open={modal.open}
                onClose={() => setModal({ open: false })}
                title={modal.planId ? 'Editar plan' : 'Nuevo plan'}
                actions={(
                    <>
                        <button
                            onClick={() => setModal({ open: false })}
                            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => savePlan()}
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                            type="button"
                        >
                            {submitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </>
                )}
            >
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={savePlan}>
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Nombre</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">DescripciA3n</label>
                        <textarea
                            value={form.description || ''}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Porcentaje plataforma (%)</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.platformFeePercent}
                            onChange={(e) => setForm({ ...form, platformFeePercent: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Cargo fijo plataforma (MXN)</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.platformFeeFixed}
                            onChange={(e) => setForm({ ...form, platformFeeFixed: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Porcentaje gateway (%)</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.paymentGatewayFeePercent}
                            onChange={(e) => setForm({ ...form, paymentGatewayFeePercent: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border px-3 py-2"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            id="isDefault"
                            type="checkbox"
                            checked={form.isDefault ?? false}
                            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="isDefault" className="text-sm text-gray-700">
                            Plan predeterminado
                        </label>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
