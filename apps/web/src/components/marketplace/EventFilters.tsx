import { useState } from 'react';

export interface EventFilters {
    search?: string;
    category?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: 'date' | 'price' | 'name';
}

interface EventFiltersProps {
    onFilterChange: (filters: EventFilters) => void;
    loading?: boolean;
}

const CATEGORIES = [
    { value: '', label: 'Todas las categorías' },
    { value: 'MUSIC', label: 'Música' },
    { value: 'SPORTS', label: 'Deportes' },
    { value: 'THEATER', label: 'Teatro' },
    { value: 'COMEDY', label: 'Comedia' },
    { value: 'CONFERENCE', label: 'Conferencias' },
    { value: 'FESTIVAL', label: 'Festivales' },
    { value: 'OTHER', label: 'Otros' },
];

const CITIES = [
    { value: '', label: 'Todas las ciudades' },
    { value: 'Ciudad de México', label: 'Ciudad de México' },
    { value: 'Guadalajara', label: 'Guadalajara' },
    { value: 'Monterrey', label: 'Monterrey' },
    { value: 'Puebla', label: 'Puebla' },
    { value: 'Querétaro', label: 'Querétaro' },
    { value: 'Tijuana', label: 'Tijuana' },
    { value: 'León', label: 'León' },
];

export function EventFiltersComponent({ onFilterChange, loading }: EventFiltersProps) {
    const [filters, setFilters] = useState<EventFilters>({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleFilterChange = (key: keyof EventFilters, value: any) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleReset = () => {
        setFilters({});
        onFilterChange({});
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar eventos por nombre..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={filters.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoría
                    </label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={filters.category || ''}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        disabled={loading}
                    >
                        {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* City */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ciudad
                    </label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={filters.city || ''}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                        disabled={loading}
                    >
                        {CITIES.map((city) => (
                            <option key={city.value} value={city.value}>
                                {city.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sort */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ordenar por
                    </label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={filters.sortBy || 'date'}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value as EventFilters['sortBy'])}
                        disabled={loading}
                    >
                        <option value="date">Fecha</option>
                        <option value="price">Precio</option>
                        <option value="name">Nombre</option>
                    </select>
                </div>
            </div>

            {/* Advanced Filters Toggle */}
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-primary-600 text-sm font-medium hover:text-primary-700 mb-4"
                disabled={loading}
            >
                {showAdvanced ? '▼ Ocultar filtros avanzados' : '▶ Mostrar filtros avanzados'}
            </button>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    {/* Price Range */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rango de precio
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                placeholder="Mín"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                value={filters.minPrice || ''}
                                onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                                disabled={loading}
                                min="0"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="number"
                                placeholder="Máx"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                value={filters.maxPrice || ''}
                                onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                                disabled={loading}
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Desde
                        </label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            value={filters.startDate || ''}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hasta
                        </label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            value={filters.endDate || ''}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>
            )}

            {/* Reset Button */}
            {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                        onClick={handleReset}
                        className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                        disabled={loading}
                    >
                        ✕ Limpiar todos los filtros
                    </button>
                </div>
            )}
        </div>
    );
}
