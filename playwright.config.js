import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false, // Run tests sequentially to avoid conflicts
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker to avoid race conditions
    reporter: 'html',

    use: {
        baseURL: 'http://localhost:8888',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Don't start the dev server - assume netlify dev is already running
    // If you want to auto-start, uncomment this:
    // webServer: {
    //   command: 'netlify dev',
    //   url: 'http://localhost:8888',
    //   reuseExistingServer: !process.env.CI,
    // },
});
