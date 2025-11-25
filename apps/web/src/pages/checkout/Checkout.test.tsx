import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { Checkout } from './Checkout';
import { CheckoutSuccess } from './CheckoutSuccess';
import { apiClient } from '../../api/client';

vi.mock('../../api/client', () => ({
    apiClient: {
        createCheckoutSession: vi.fn(),
        createMercadoPagoPreference: vi.fn(),
    },
}));

vi.mock('../../lib/mercadoPago', () => ({
    getMercadoPagoInstance: vi.fn().mockResolvedValue({
        bricks: () => ({
            create: vi.fn().mockResolvedValue(undefined),
        }),
    }),
}));

vi.mock('../../features/checkout/components/OpenpayCardForm', () => ({
    OpenpayCardForm: ({ onSuccess }: { onSuccess: (response: any) => void }) => (
        <button onClick={() => onSuccess({ id: 'charge-1', status: 'completed' })}>Simular pago</button>
    ),
}));

const mockedClient = apiClient as unknown as {
    createCheckoutSession: ReturnType<typeof vi.fn>;
    createMercadoPagoPreference: ReturnType<typeof vi.fn>;
};

const renderCheckout = () =>
    render(
        <MemoryRouter
            initialEntries={[
                {
                    pathname: '/checkout/event-123',
                    state: {
                        templateId: 'template-1',
                        quantity: 2,
                        eventTitle: 'Gran concierto',
                        templateName: 'VIP',
                        price: 100,
                    },
                },
            ]}
        >
            <Routes>
                <Route path="/checkout/:eventId" element={<Checkout />} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
            </Routes>
        </MemoryRouter>,
    );

describe('Checkout page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('crea la sesión y redirige tras simular un pago', async () => {
        mockedClient.createCheckoutSession.mockResolvedValue({
            orderId: 'order-xyz',
            total: 200,
            currency: 'MXN',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });

        renderCheckout();

        await userEvent.type(screen.getByPlaceholderText('Juan Perez'), 'Test Buyer');
        await userEvent.type(screen.getByPlaceholderText('juan@ejemplo.com'), 'buyer@example.com');
        await userEvent.type(screen.getByPlaceholderText('5512345678'), '5512345678');

        await userEvent.click(screen.getByRole('button', { name: /Continuar con el pago/i }));

        await waitFor(() => {
            expect(mockedClient.createCheckoutSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: 'event-123',
                    tickets: [{ templateId: 'template-1', quantity: 2 }],
                }),
            );
        });

        await screen.findByRole('button', { name: /Simular pago/i });
        await userEvent.click(screen.getByRole('button', { name: /Simular pago/i }));

        await screen.findByText(/Compra completada/i);
    });
});
