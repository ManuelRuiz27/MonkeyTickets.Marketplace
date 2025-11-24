import { defineConfig, devices } from '@playwright/test';

const shouldRunE2E = process.env.RUN_E2E === 'true';

export default defineConfig({
    testDir: './tests',
    timeout: 60 * 1000,
    expect: {
        timeout: 10 * 1000,
    },
    fullyParallel: true,
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
        headless: true,
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    reporter: [['list']],
    workers: process.env.CI ? 2 : undefined,
});
