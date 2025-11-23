export function DirectorDashboard() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-4xl font-bold">Panel de Director</h1>
                    <p className="text-purple-100 mt-2">Administración de la plataforma</p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border-l-4 border-purple-500">
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Organizadores</h3>
                        <p className="text-4xl font-bold mt-2 text-purple-600">0</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border-l-4 border-blue-500">
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Eventos</h3>
                        <p className="text-4xl font-bold mt-2 text-blue-600">0</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border-l-4 border-green-500">
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Órdenes</h3>
                        <p className="text-4xl font-bold mt-2 text-green-600">0</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border-l-4 border-yellow-500">
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Ingresos Plataforma</h3>
                        <p className="text-4xl font-bold mt-2 text-yellow-600">$0</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-2xl font-semibold mb-6 text-gray-900">Métricas de la Plataforma</h2>
                    <div className="text-center py-12 text-gray-500">
                        <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-lg">Las métricas y análisis se mostrarán aquí</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
