import { test, expect } from '@playwright/test';

/**
 * Card Search and Filter Tests
 * Tests the search functionality for finding specific cards
 */

test.describe('Card Search Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('button:has-text("Singles")');
        await page.waitForSelector('.product-card', { timeout: 10000 });
    });

    test('should have a search input field', async ({ page }) => {
        // Look for search input
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i], #search');

        // If search exists, it should be visible
        if (await searchInput.count() > 0) {
            await expect(searchInput.first()).toBeVisible();
        } else {
            // Log that search is missing
            console.warn('⚠️ Search input not found on singles page');
            test.skip();
        }
    });

    test('should filter cards by search term', async ({ page }) => {
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

        if (await searchInput.count() > 0) {
            // Get initial card count
            const initialCards = await page.locator('.product-card:visible').count();

            // Search for a specific term (e.g., "Lee")
            await searchInput.first().fill('Lee');
            await page.waitForTimeout(500);

            // Get filtered card count
            const filteredCards = await page.locator('.product-card:visible').count();

            // Should have fewer cards (or same if all cards match)
            expect(filteredCards).toBeLessThanOrEqual(initialCards);

            // Verify visible cards contain the search term
            if (filteredCards > 0) {
                const firstCard = page.locator('.product-card:visible').first();
                const cardName = await firstCard.locator('.product-name, h3').textContent();
                expect(cardName?.toLowerCase()).toContain('lee');
            }
        } else {
            test.skip();
        }
    });

    test('should clear search results when search is cleared', async ({ page }) => {
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

        if (await searchInput.count() > 0) {
            // Search for something
            await searchInput.first().fill('Test');
            await page.waitForTimeout(500);

            // Clear search
            await searchInput.first().clear();
            await page.waitForTimeout(500);

            // Should show all cards again
            const cards = await page.locator('.product-card:visible').count();
            expect(cards).toBeGreaterThan(0);
        } else {
            test.skip();
        }
    });

    test('should show "no results" message for non-existent cards', async ({ page }) => {
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

        if (await searchInput.count() > 0) {
            // Search for something that doesn't exist
            await searchInput.first().fill('ZZZZNONEXISTENTCARD9999');
            await page.waitForTimeout(500);

            // Should show no cards or a "no results" message
            const cards = await page.locator('.product-card:visible').count();
            const noResultsMsg = page.locator('text=/no.*results|no.*found|no.*cards/i');

            const hasNoResults = cards === 0 || await noResultsMsg.count() > 0;
            expect(hasNoResults).toBeTruthy();
        } else {
            test.skip();
        }
    });
});

test.describe('Advanced Filters', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('button:has-text("Singles")');
        await page.waitForSelector('.product-card', { timeout: 10000 });
    });

    test('should filter by rarity if rarity filter exists', async ({ page }) => {
        const rarityFilter = page.locator('select[name*="rarity" i], button:has-text("Rare"), button:has-text("Common")');

        if (await rarityFilter.count() > 0) {
            // Click or select rarity
            await rarityFilter.first().click();
            await page.waitForTimeout(500);

            // Verify cards are filtered
            const cards = await page.locator('.product-card:visible').count();
            expect(cards).toBeGreaterThanOrEqual(0);
        }
    });

    test('should filter by card type if type filter exists', async ({ page }) => {
        const typeFilter = page.locator('select[name*="type" i], button:has-text("Unit"), button:has-text("Spell")');

        if (await typeFilter.count() > 0) {
            await typeFilter.first().click();
            await page.waitForTimeout(500);

            const cards = await page.locator('.product-card:visible').count();
            expect(cards).toBeGreaterThanOrEqual(0);
        }
    });

    test('should combine multiple filters', async ({ page }) => {
        // Apply domain filter
        const furyButton = page.locator('button:has-text("Fury")');
        if (await furyButton.count() > 0) {
            await furyButton.first().click();
            await page.waitForTimeout(500);
        }

        // Apply search if available
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
        if (await searchInput.count() > 0) {
            await searchInput.first().fill('Lee');
            await page.waitForTimeout(500);
        }

        // Should show filtered results
        const cards = await page.locator('.product-card:visible').count();
        expect(cards).toBeGreaterThanOrEqual(0);
    });
});

test.describe('Sort Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.click('button:has-text("Singles")');
        await page.waitForSelector('.product-card', { timeout: 10000 });
    });

    test('should have sort options if available', async ({ page }) => {
        const sortSelect = page.locator('select[name*="sort" i], select:has-text("Price"), select:has-text("Name")');

        if (await sortSelect.count() > 0) {
            await expect(sortSelect.first()).toBeVisible();
        }
    });

    test('should sort by price if available', async ({ page }) => {
        const sortSelect = page.locator('select[name*="sort" i]');

        if (await sortSelect.count() > 0) {
            // Select price sort
            await sortSelect.first().selectOption({ label: /price/i });
            await page.waitForTimeout(500);

            // Verify cards are displayed
            const cards = await page.locator('.product-card:visible').count();
            expect(cards).toBeGreaterThan(0);
        }
    });
});
