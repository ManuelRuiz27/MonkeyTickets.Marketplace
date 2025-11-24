import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { Checkout } from './Checkout';
import { apiClient } from '../../api/client';

vi.mock('../../api/client', () => ({
    apiClient: {
        createCheckoutSession: vi.fn(),
        payOrder: vi.fn(),
    },
}));

const mockedClient = apiClient as unknown as {
    createCheckoutSession: ReturnType<typeof vi.fn>;
    payOrder: ReturnType<typeof vi.fn>;
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
            </Routes>
        </MemoryRouter>,
    );

describe('Checkout page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('submits buyer information and displays success state', async () => {
        mockedClient.createCheckoutSession.mockResolvedValue({
            orderId: 'order-xyz',
            total: 200,
            currency: 'MXN',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
        mockedClient.payOrder.mockResolvedValue({
            paymentId: 'payment-xyz',
            providerPaymentId: 'mp_123',
        });

        renderCheckout();

        await userEvent.type(screen.getByPlaceholderText('Juan Pérez'), 'Test Buyer');
        await userEvent.type(screen.getByPlaceholderText('juan@ejemplo.com'), 'buyer@example.com');
        await userEvent.type(screen.getByPlaceholderText('+52 55 1234 5678'), '5512345678');

        const selects = screen.getAllByRole('combobox');
        await userEvent.selectOptions(selects[0], 'mercadopago');
        await userEvent.selectOptions(selects[1], 'spei');
        await userEvent.type(screen.getByPlaceholderText(/token_abc123/i), 'tok_visa');

        await userEvent.click(screen.getByRole('button', { name: /Pagar Ahora/i }));

        await waitFor(() => {
            expect(mockedClient.createCheckoutSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventId: 'event-123',
                    tickets: [{ templateId: 'template-1', quantity: 2 }],
                }),
            );
        });

        await screen.findByText(/Pago iniciado/i);
        expect(mockedClient.payOrder).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: 'mercadopago',
                method: 'spei',
                token: 'tok_visa',
            }),
        );
    });
});
