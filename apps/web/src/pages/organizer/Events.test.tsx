import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { OrganizerEventsPage } from './Events';
import { apiClient } from '../../api/client';

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { role: 'ORGANIZER', email: 'org@test.com', organizer: { id: 'org-1' } },
        token: 'token',
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
    }),
}));

vi.mock('../../api/client', () => ({
    apiClient: {
        getOrganizerEvents: vi.fn(),
        deleteOrganizerEvent: vi.fn(),
        createOrganizerEvent: vi.fn(),
    },
}));

const mockedClient = apiClient as unknown as {
    getOrganizerEvents: ReturnType<typeof vi.fn>;
    deleteOrganizerEvent: ReturnType<typeof vi.fn>;
    createOrganizerEvent: ReturnType<typeof vi.fn>;
};

describe('OrganizerEventsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders data fetched from the API', async () => {
        mockedClient.getOrganizerEvents.mockResolvedValue([
            {
                id: 'event-1',
                title: 'Feria musical',
                category: 'Música',
                venue: 'Auditorio',
                city: 'CDMX',
                startDate: '2025-05-01T20:00:00.000Z',
                templates: [{ sold: 5, price: 100 }],
                status: 'PUBLISHED',
            },
        ]);

        render(
            <MemoryRouter>
                <OrganizerEventsPage />
            </MemoryRouter>,
        );

        expect(await screen.findByText(/Feria musical/)).toBeInTheDocument();
        expect(screen.getByText(/PUBLISHED/)).toBeInTheDocument();
    });

    it('cancels events and calls API', async () => {
        mockedClient.getOrganizerEvents.mockResolvedValue([
            {
                id: 'event-2',
                title: 'Expo',
                category: 'Arte',
                venue: 'Galería',
                city: 'CDMX',
                startDate: '2025-05-01T20:00:00.000Z',
                templates: [],
                status: 'PUBLISHED',
            },
        ]);
        mockedClient.deleteOrganizerEvent.mockResolvedValue(undefined);
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <MemoryRouter>
                <OrganizerEventsPage />
            </MemoryRouter>,
        );

        await screen.findByText(/Expo/);
        await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

        await waitFor(() => {
            expect(mockedClient.deleteOrganizerEvent).toHaveBeenCalledWith('event-2');
        });
    });
});
