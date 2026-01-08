interface GlobalKPIsProps {
    metrics: {
        organizers: {
            total: number;
            active: number;
            pending: number;
            suspended: number;
        };
        events: {
            total: number;
            active: number;
        };
        tickets: {
            sold: number;
        };
        revenue: {
            platformFees: number;
            organizersIncome: number;
            totalProcessed: number;
        };
    };
}

export function GlobalKPIs({ metrics }: GlobalKPIsProps) {
    const kpis = [
        {
            label: 'Organizadores Activos',
            value: metrics.organizers.active,
            total: metrics.organizers.total,
        },
        {
            label: 'Eventos Activos',
            value: metrics.events.active,
            total: metrics.events.total,
        },
        {
            label: 'Tickets vendidos',
            value: metrics.tickets.sold,
        },
        {
            label: 'Comisiones de Plataforma',
            value: `$${metrics.revenue.platformFees.toLocaleString('es-MX')}`,
            subtitle: 'MXN',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {kpi.value}
                                {kpi.total !== undefined && (
                                    <span className="text-lg font-normal text-gray-400">/{kpi.total}</span>
                                )}
                            </p>
                            {kpi.subtitle && (
                                <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>
                            )}
                        </div>
                        <div className="p-3 rounded-full bg-green-100">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
