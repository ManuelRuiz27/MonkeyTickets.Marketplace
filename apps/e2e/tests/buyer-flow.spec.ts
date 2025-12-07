import { test, expect } from '@playwright/test';

const shouldRunE2E = process.env.RUN_E2E === 'true';

test.describe('Buyer journey - checkout invitado', () => {
    test.skip(!shouldRunE2E, 'Set RUN_E2E=true to enable end-to-end tests.');

    test('llega a checkout y ve opciones Mercado Pago y Openpay', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/MonoMarket/i);

        // Abrir el detalle del primer evento del marketplace
        await page.getByRole('button', { name: /Ver Detalles/i }).first().click();
        await expect(page.getByText(/Boletos Disponibles/i)).toBeVisible();

        // Seleccionar el primer tipo de boleto usando data-testid
        await page.getByTestId(/ticket-template-/).first().click();

        // Ir al checkout
        await page.getByRole('button', { name: /Comprar Ahora/i }).click();

        // Completar datos del comprador (checkout invitado)
        await page.getByLabel('Nombre').fill('E2E Buyer');
        await page.getByLabel('Apellidos').fill('Tester');
        await page.getByLabel('Email').fill('buyer+e2e@monomarket.dev');
        await page.getByLabel(/Tel.*fono/i).fill('5512345678');

        await page.getByRole('button', { name: /Continuar al pago/i }).click();

        // Sección de métodos de pago
        await expect(page.getByText(/Selecciona tu m.*todo de pago/i)).toBeVisible();

        // Deben existir ambas pestañas: Mercado Pago y Openpay
        const mpTab = page.getByRole('button', { name: /Mercado Pago/i });
        const opTab = page.getByRole('button', { name: /Openpay/i });

        await expect(mpTab).toBeVisible();
        await expect(opTab).toBeVisible();

        // Validar que al seleccionar Openpay se ve el formulario de tarjeta Openpay / BBVA
        await opTab.click();
        await page.getByText(/Tarjeta.*Openpay/i).click();
        await expect(page.getByText(/Openpay \/ BBVA/i)).toBeVisible();

        // Volver a Mercado Pago y validar botón de wallet
        await mpTab.click();
        await page.getByText(/Mercado Pago Wallet/i).click();
        await expect(page.getByRole('button', { name: /Pagar con Mercado Pago/i })).toBeVisible();
    });
});

