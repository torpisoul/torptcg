import { test, expect } from '@playwright/test';

/**
 * Price Trends Widget Test
 * Verifies that the new widget appears and displays data.
 * Mocks backend responses to ensure UI renders independent of local server state.
 */

test.describe('Admin Page - Price Trends Widget', () => {
    test('should display the price trends widget and pricing on cards', async ({ page }) => {
        // Mock Cards API
        await page.route('**/.netlify/functions/cards', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    page: {
                        cards: {
                            items: [
                                {
                                    id: 'ogn-076-298',
                                    name: 'Yasuo, Remorseful',
                                    publicCode: 'OGN-076/298',
                                    stock: 5,
                                    cardImage: { url: 'https://via.placeholder.com/150' }
                                },
                                {
                                    id: 'ogs-004-024',
                                    name: 'Yi, Meditative',
                                    publicCode: 'OGS-004/024',
                                    stock: 2,
                                    cardImage: { url: 'https://via.placeholder.com/150' }
                                }
                            ]
                        }
                    }
                })
            });
        });

        // Mock Inventory API
        await page.route('**/.netlify/functions/inventory', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { productId: 'ogn-076-298', stock: 5 },
                    { productId: 'ogs-004-024', stock: 2 }
                ])
            });
        });

        // Go to admin page
        await page.goto('/admin/card-inventory.html');

        // Wait for widget to load
        const widget = page.locator('.price-trends-widget');
        await expect(widget).toBeVisible({ timeout: 10000 });

        // Check for title
        await expect(widget).toContainText('Market Price Trends');

        // Check for chart canvas
        const canvas = widget.locator('canvas#priceTrendChart');
        await expect(canvas).toBeVisible();

        // Check for recent changes section
        const changesList = widget.locator('.recent-changes-list');
        await expect(changesList).toBeVisible();
        await expect(changesList).toContainText('Recent Price Updates');

        // Check if items are loaded (mock data in widget)
        const changeItems = widget.locator('.change-item');
        await expect(changeItems.first()).toBeVisible();

        // Check if card list rendered (based on our mock API)
        await expect(page.locator('.inventory-card').first()).toBeVisible();

        // Check if prices are displayed on cards
        // The mock logic in the HTML uses fallback data for these IDs
        const firstCardPrice = page.locator('.card-price-display').first();
        await expect(firstCardPrice).toBeVisible();
        await expect(firstCardPrice).toContainText('£');
    });
});
