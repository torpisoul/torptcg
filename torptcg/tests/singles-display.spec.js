import { test, expect } from '@playwright/test';

/**
 * Singles Page - Display Tests
 * Tests that cards display correctly with proper styling and stock labels
 */

test.describe('Singles Page - Card Display', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Click on Singles filter
        await page.click('button:has-text("Singles")');
        // Wait for cards to load
        await page.waitForSelector('.product-card', { timeout: 10000 });
    });

    test('should display product cards', async ({ page }) => {
        const cards = await page.locator('.product-card').count();
        expect(cards).toBeGreaterThan(0);
    });

    test('should display card images', async ({ page }) => {
        const firstCard = page.locator('.product-card').first();
        const image = firstCard.locator('.product-image');
        await expect(image).toBeVisible();

        // Check that image has loaded
        const src = await image.getAttribute('src');
        expect(src).toBeTruthy();
    });

    test('should display card names', async ({ page }) => {
        const firstCard = page.locator('.product-card').first();
        const name = firstCard.locator('.product-name, h3');
        await expect(name).toBeVisible();
        const text = await name.textContent();
        expect(text?.trim()).toBeTruthy();
    });

    test('should display stock labels correctly', async ({ page }) => {
        const cards = page.locator('.product-card');
        const count = await cards.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const card = cards.nth(i);
            const stockLabel = card.locator('.stock-badge, .stock-label, .stock-status');

            // Stock label should exist
            if (await stockLabel.count() > 0) {
                const text = await stockLabel.first().textContent();

                // Check if stock text indicates item status
                const lowerText = text?.toLowerCase() || '';
                const validStockMessages = ['in stock', 'only 1 left', 'low stock', 'available', 'out of stock'];
                const hasValidMessage = validStockMessages.some(msg => lowerText.includes(msg));

                expect(hasValidMessage).toBeTruthy();
            }
        }
    });

    test('should display prices', async ({ page }) => {
        const firstCard = page.locator('.product-card').first();
        const price = firstCard.locator('.product-price, .price, [class*="price"]');
        await expect(price.first()).toBeVisible();
    });

    test('should have add to cart buttons', async ({ page }) => {
        const firstCard = page.locator('.product-card').first();
        const addButton = firstCard.locator('button:has-text("Add"), button:has-text("Cart"), .add-to-cart');
        await expect(addButton.first()).toBeVisible();
    });
});

test.describe('Singles Page - CSS Effects', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('button:has-text("Singles")');
        await page.waitForSelector('.product-card', { timeout: 10000 });
    });

    test('should apply hover effects on single-domain cards', async ({ page }) => {
        // Find a single-domain card (has data-domain but not data-domain-2)
        const singleDomainCard = page.locator('.product-card[data-domain]:not([data-domain-2])').first();

        if (await singleDomainCard.count() > 0) {
            // Get initial box-shadow
            const initialShadow = await singleDomainCard.evaluate(el =>
                window.getComputedStyle(el).boxShadow
            );

            // Hover over the card
            await singleDomainCard.hover();

            // Wait a bit for transition
            await page.waitForTimeout(300);

            // Get hover box-shadow
            const hoverShadow = await singleDomainCard.evaluate(el =>
                window.getComputedStyle(el).boxShadow
            );

            // Shadow should change on hover
            expect(hoverShadow).not.toBe(initialShadow);
            expect(hoverShadow).not.toBe('none');
        }
    });

    test('should apply gradient border on dual-domain cards on hover', async ({ page }) => {
        // Find a dual-domain card (has both data-domain and data-domain-2)
        const dualDomainCard = page.locator('.product-card[data-domain][data-domain-2]').first();

        if (await dualDomainCard.count() > 0) {
            // Hover over the card
            await dualDomainCard.hover();

            // Wait for transition
            await page.waitForTimeout(300);

            // Check for gradient border styling
            const backgroundImage = await dualDomainCard.evaluate(el =>
                window.getComputedStyle(el).backgroundImage
            );

            // Should have gradient background for border effect
            expect(backgroundImage).toContain('linear-gradient');
        }
    });

    test('should have domain-specific data attributes', async ({ page }) => {
        const cards = page.locator('.product-card[data-domain]');
        const count = await cards.count();

        expect(count).toBeGreaterThan(0);

        // Check first card has valid domain
        const firstDomain = await cards.first().getAttribute('data-domain');
        const validDomains = ['fury', 'calm', 'mind', 'body', 'chaos', 'order'];
        expect(validDomains).toContain(firstDomain);
    });

    test('should apply rainbow gradient for non-singles on hover', async ({ page }) => {
        // Go back to All products
        await page.click('button:has-text("All")');
        await page.waitForTimeout(500);

        // Find a product without data-domain (non-single)
        const nonSingleCard = page.locator('.product-card:not([data-domain])').first();

        if (await nonSingleCard.count() > 0) {
            await nonSingleCard.hover();
            await page.waitForTimeout(300);

            const backgroundImage = await nonSingleCard.evaluate(el =>
                window.getComputedStyle(el).backgroundImage
            );

            // Should have rainbow gradient
            expect(backgroundImage).toContain('linear-gradient');
        }
    });
});

test.describe('Singles Page - Domain Filters', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('button:has-text("Singles")');
        await page.waitForSelector('.product-card', { timeout: 10000 });
    });

    test('should filter by Fury domain', async ({ page }) => {
        // Click Fury filter if it exists
        const furyButton = page.locator('button:has-text("Fury"), .filter-btn:has-text("Fury")');

        if (await furyButton.count() > 0) {
            await furyButton.first().click();
            await page.waitForTimeout(500);

            // All visible cards should have fury domain
            const cards = page.locator('.product-card:visible');
            const count = await cards.count();

            if (count > 0) {
                for (let i = 0; i < Math.min(count, 5); i++) {
                    const domain = await cards.nth(i).getAttribute('data-domain');
                    const domain2 = await cards.nth(i).getAttribute('data-domain-2');

                    // Card should have fury as primary or secondary domain
                    const hasFury = domain === 'fury' || domain2 === 'fury';
                    expect(hasFury).toBeTruthy();
                }
            }
        }
    });

    test('should filter by Calm domain', async ({ page }) => {
        const calmButton = page.locator('button:has-text("Calm"), .filter-btn:has-text("Calm")');

        if (await calmButton.count() > 0) {
            await calmButton.first().click();
            await page.waitForTimeout(500);

            const cards = page.locator('.product-card:visible');
            const count = await cards.count();

            if (count > 0) {
                const domain = await cards.first().getAttribute('data-domain');
                const domain2 = await cards.first().getAttribute('data-domain-2');
                const hasCalm = domain === 'calm' || domain2 === 'calm';
                expect(hasCalm).toBeTruthy();
            }
        }
    });

    test('should show all singles when clicking "All Singles"', async ({ page }) => {
        // Click a specific domain first
        const furyButton = page.locator('button:has-text("Fury")');
        if (await furyButton.count() > 0) {
            await furyButton.first().click();
            await page.waitForTimeout(500);
        }

        // Then click All Singles
        const allButton = page.locator('button:has-text("All"), button:has-text("Singles")');
        await allButton.first().click();
        await page.waitForTimeout(500);

        // Should show cards from multiple domains
        const cards = page.locator('.product-card:visible');
        const count = await cards.count();
        expect(count).toBeGreaterThan(0);
    });
});

test.describe('Singles Page - Stock Display', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('button:has-text("Singles")');
        await page.waitForSelector('.product-card', { timeout: 10000 });
    });

    test('should show correct stock status for in-stock items', async ({ page }) => {
        const inStockCards = page.locator('.product-card:visible');
        const count = await inStockCards.count();

        if (count > 0) {
            const stockLabel = inStockCards.first().locator('.stock-badge');

            // Check if stock badge exists
            if (await stockLabel.count() > 0) {
                const text = await stockLabel.first().textContent();

                // Check if stock text indicates item status
                const lowerText = text?.toLowerCase() || '';
                const validStockMessages = ['in stock', 'only 1 left', 'low stock', 'available'];
                const hasValidMessage = validStockMessages.some(msg => lowerText.includes(msg));

                // Should indicate item is available (not out of stock)
                expect(hasValidMessage).toBeTruthy();
                expect(lowerText).not.toContain('out of stock');
            }
        }
    });

    test('should not display out-of-stock items by default', async ({ page }) => {
        // Check if there's an out-of-stock toggle
        const toggle = page.locator('input[type="checkbox"]#showOutOfStock, .out-of-stock-toggle');

        if (await toggle.count() > 0) {
            // Make sure it's unchecked
            const isChecked = await toggle.isChecked();
            if (isChecked) {
                await toggle.click();
                await page.waitForTimeout(500);
            }
        }

        // All visible cards should have stock > 0
        const cards = page.locator('.product-card:visible');
        const count = await cards.count();

        for (let i = 0; i < Math.min(count, 10); i++) {
            const stockBadge = cards.nth(i).locator('.stock-badge');

            // Check if stock badge exists
            if (await stockBadge.count() > 0) {
                const stockText = await stockBadge.first().textContent();
                const lowerText = stockText?.toLowerCase() || '';

                // Should not show "out of stock" since toggle is off
                expect(lowerText).not.toContain('out of stock');
            }
        }
    });
});
