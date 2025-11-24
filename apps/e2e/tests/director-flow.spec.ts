import { test, expect } from '@playwright/test';

const shouldRunE2E = process.env.RUN_E2E === 'true';

test.describe('Director workflow', () => {
    test.skip(!shouldRunE2E, 'Set RUN_E2E=true to enable end-to-end tests.');

    test('logs in, views metrics, and searches for orders', async ({ page }) => {
        await page.goto('/director/login');
        await page.getByLabel(/Correo/i).fill('director@example.com');
        await page.getByLabel(/Contraseña/i).fill('supersecret');
        await page.getByRole('button', { name: /Entrar al Panel/i }).click();

        await expect(page.getByText(/Visión general de la plataforma/i)).toBeVisible();
        await page.getByLabel(/Desde/i).fill('2024-01-01');
        await page.getByLabel(/Hasta/i).fill('2024-12-31');

        await expect(page.getByText(/Ingresos de la plataforma/)).toBeVisible();
        await page.goto('/director/orders');
        await page.getByLabel(/Orden ID/i).fill('order-1');
        await page.getByRole('button', { name: /Buscar/i }).click();
        await expect(page.getByText(/order-1/i)).toBeVisible();
    });
});
