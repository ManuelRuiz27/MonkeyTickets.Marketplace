import { test, expect } from '@playwright/test';

const shouldRunE2E = process.env.RUN_E2E === 'true';

test.describe('Buyer journey', () => {
    test.skip(!shouldRunE2E, 'Set RUN_E2E=true to enable end-to-end tests.');

    test('completes a purchase from listing to payment', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/MonoMarket/i);

        await page.getByRole('link', { name: /ver detalles/i }).first().click();
        await page.getByRole('button', { name: /comprar boletos/i }).click();

        await page.getByLabel('Nombre Completo').fill('E2E Buyer');
        await page.getByLabel(/Correo/i).fill('buyer+e2e@monomarket.dev');
        await page.getByLabel(/Teléfono/i).fill('5512345678');
        await page.getByLabel(/Proveedor/i).selectOption('mercadopago');
        await page.getByLabel(/Método/i).selectOption('spei');
        await page.getByLabel(/Token o Referencia/i).fill('tok_test_123');
        await page.getByLabel(/Mensualidades/i).fill('1');

        await page.getByRole('button', { name: /Pagar Ahora/i }).click();
        await expect(page.getByText(/Pago iniciado/i)).toBeVisible();
    });
});
