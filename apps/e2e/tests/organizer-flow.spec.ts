import { test, expect } from '@playwright/test';

const shouldRunE2E = process.env.RUN_E2E === 'true';

test.describe('Organizer workflow', () => {
    test.skip(!shouldRunE2E, 'Set RUN_E2E=true to enable end-to-end tests.');

    test('logs in, creates an event, and reviews sales', async ({ page }) => {
        await page.goto('/organizer/login');
        await page.getByLabel(/Correo/i).fill('organizer@example.com');
        await page.getByLabel(/Contraseña/i).fill('password123');
        await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

        await expect(page.getByText(/Tus eventos/)).toBeVisible();
        await page.getByRole('button', { name: /Nuevo evento/i }).click();

        await page.getByLabel(/Nombre del evento/i).fill('Expo QA E2E');
        await page.getByLabel(/Fecha de inicio/i).fill('2025-05-01T18:00');
        await page.getByLabel(/Capacidad/i).fill('250');
        await page.getByLabel(/Precio base/i).fill('500');
        await page.getByRole('button', { name: /^Crear$/i }).click();

        await expect(page.getByText(/Expo QA E2E/)).toBeVisible();
        await page.getByRole('button', { name: /Ver ventas/i }).first().click();
        await expect(page.getByText(/Resumen de ventas/)).toBeVisible();
    });
});
