import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DirectorDashboardPage } from './Dashboard';
import { apiClient } from '../../api/client';

vi.mock('../../api/client', () => ({
    apiClient: {
        getDirectorOverview: vi.fn(),
        getDirectorTopOrganizers: vi.fn(),
        getDirectorTopEvents: vi.fn(),
    },
}));

const mockedClient = apiClient as unknown as {
    getDirectorOverview: ReturnType<typeof vi.fn>;
    getDirectorTopOrganizers: ReturnType<typeof vi.fn>;
    getDirectorTopEvents: ReturnType<typeof vi.fn>;
};

describe('DirectorDashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedClient.getDirectorOverview.mockResolvedValue({
            totalGrossSales: 1000,
            platformRevenue: 120,
            totalTicketsSold: 80,
            activeEvents: 5,
            activeOrganizers: 3,
        });
        mockedClient.getDirectorTopOrganizers.mockResolvedValue([
            { organizerId: 'org-1', businessName: 'Alpha', totalRevenue: 700, ticketsSold: 20 },
            { organizerId: 'org-2', businessName: 'Beta', totalRevenue: 200, ticketsSold: 5 },
        ]);
        mockedClient.getDirectorTopEvents.mockResolvedValue([
            { eventId: 'event-1', title: 'Expo', organizerName: 'Alpha', organizerId: 'org-1', totalRevenue: 500, ticketsSold: 10 },
        ]);
    });

    it('displays KPIs from API responses', async () => {
        render(<DirectorDashboardPage />);

        expect(await screen.findByText(/\$1,000 MXN/)).toBeInTheDocument();
        expect(screen.getByText(/Ingresos de la plataforma/)).toBeInTheDocument();
        expect(mockedClient.getDirectorOverview).toHaveBeenCalled();
    });

    it('refetches data when filters change', async () => {
        render(<DirectorDashboardPage />);
        await screen.findByText(/ventas brutas/i);

        await userEvent.type(screen.getByLabelText(/Desde/i), '2024-01-01');
        await userEvent.type(screen.getByLabelText(/Hasta/i), '2024-01-31');

        await waitFor(() => {
            expect(mockedClient.getDirectorOverview).toHaveBeenLastCalledWith({
                from: '2024-01-01',
                to: '2024-01-31',
            });
        });
    });
});
