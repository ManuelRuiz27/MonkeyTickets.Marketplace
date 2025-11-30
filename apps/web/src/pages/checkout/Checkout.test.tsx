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
            create: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
        }),
    }),
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

    it('crea la sesión y solicita la preferencia de Mercado Pago', async () => {
        mockedClient.createCheckoutSession.mockResolvedValue({
            orderId: 'order-xyz',
            total: 200,
            currency: 'MXN',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
        mockedClient.createMercadoPagoPreference.mockResolvedValue({
            preferenceId: 'pref-123',
            initPoint: '',
        });

        renderCheckout();

        await userEvent.type(screen.getByPlaceholderText('Juan Perez'), 'Test Buyer');
        await userEvent.type(screen.getByPlaceholderText('juan@ejemplo.com'), 'buyer@example.com');
        await userEvent.type(screen.getByPlaceholderText('5512345678'), '5512345678');

        await userEvent.click(screen.getByRole('button', { name: /Continuar al Pago/i }));

        await waitFor(() => {
            expect(mockedClient.createCheckoutSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: 'event-123',
                    tickets: [{ templateId: 'template-1', quantity: 2 }],
                }),
            );
        });

        const mpButton = await screen.findByRole('button', { name: /Pagar con Mercado Pago/i });
        await userEvent.click(mpButton);

        await waitFor(() => {
            expect(mockedClient.createMercadoPagoPreference).toHaveBeenCalledWith(
                expect.objectContaining({ orderId: 'order-xyz' }),
            );
        });
    });
});
