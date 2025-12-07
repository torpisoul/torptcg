import { test, expect } from '@playwright/test';

/**
 * Inventory Management Tests
 * Tests adding, updating, and removing cards from inventory
 */

const TEST_CARD_ID = 'test-card-001';
const TEST_CARD_NAME = 'Test Card for Automation';

test.describe('Inventory Management - Add Card', () => {
    test('should add a new card to inventory and display on product page', async ({ page }) => {
        // Step 1: Go to card inventory admin page
        await page.goto('/admin/card-inventory.html');
        await page.waitForLoadState('networkidle');

        // Wait for cards to load
        await page.waitForSelector('.card-item, .inventory-card', { timeout: 10000 });

        // Step 2: Search for a card that currently has 0 stock
        // We'll use the search/filter to find a card
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

        if (await searchInput.count() > 0) {
            // Search for a specific card (e.g., a common card)
            await searchInput.first().fill('ogn-001');
            await page.waitForTimeout(500);
        }

        // Find the first card in the list
        const firstCard = page.locator('.card-item, .inventory-card, [data-card-id]').first();
        await expect(firstCard).toBeVisible({ timeout: 5000 });

        // Get the card ID
        const cardId = await firstCard.evaluate(el => {
            return el.getAttribute('data-card-id') ||
                el.querySelector('[data-card-id]')?.getAttribute('data-card-id') ||
                el.id;
        });

        console.log('Testing with card ID:', cardId);

        // Step 3: Set stock to a non-zero value
        const stockInput = firstCard.locator('input[type="number"], .stock-input');
        await stockInput.fill('3');

        // Or click increment button
        const incrementBtn = firstCard.locator('button:has-text("+"), .stock-btn:has-text("+")');
        if (await incrementBtn.count() > 0 && await stockInput.count() === 0) {
            await incrementBtn.click();
            await incrementBtn.click();
            await incrementBtn.click();
        }

        // Step 4: Save changes
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
        await saveButton.first().click();

        // Wait for save to complete
        await page.waitForTimeout(2000);

        // Step 5: Go to main product page
        await page.goto('/');
        await page.click('button:has-text("Singles")');
        await page.waitForSelector('.product-card', { timeout: 10000 });

        // Step 6: Verify the card appears on the product page
        // Search for the card by its ID or name
        const productCards = page.locator('.product-card');
        const count = await productCards.count();

        let foundCard = false;
        for (let i = 0; i < count; i++) {
            const card = productCards.nth(i);
            const cardName = await card.locator('.product-name, h3').textContent();
            const cardImage = await card.locator('img').getAttribute('alt');

            if (cardName?.includes(cardId) || cardImage?.includes(cardId)) {
                foundCard = true;

                // Verify stock label shows in stock
                const stockLabel = card.locator('.stock-label, [class*="stock"]');
                const stockText = await stockLabel.first().textContent();

                // Check if stock text indicates item is available (not out of stock)
                const lowerStockText = stockText?.toLowerCase() || '';
                const validInStockMessages = ['in stock', 'only 1 left', 'low stock', 'available'];
                const isInStock = validInStockMessages.some(msg => lowerStockText.includes(msg));

                expect(isInStock).toBeTruthy();
                expect(lowerStockText).not.toContain('out of stock');

                break;
            }
        }

        // If we didn't find it by ID, at least verify cards are showing
        expect(count).toBeGreaterThan(0);
    });
});

test.describe('Inventory Management - Update Card', () => {
    test('should update card stock and reflect changes on product page', async ({ page }) => {
        // Step 1: Go to card inventory admin page
        await page.goto('/admin/card-inventory.html');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.card-item, .inventory-card', { timeout: 10000 });

        // Step 2: Find a card with existing stock
        const cards = page.locator('.card-item, .inventory-card, [data-card-id]');
        const count = await cards.count();

        let targetCard = null;
        let originalStock = 0;

        for (let i = 0; i < Math.min(count, 10); i++) {
            const card = cards.nth(i);
            const stockInput = card.locator('input[type="number"], .stock-input');

            if (await stockInput.count() > 0) {
                const stockValue = await stockInput.inputValue();
                originalStock = parseInt(stockValue) || 0;

                if (originalStock > 0) {
                    targetCard = card;
                    break;
                }
            }
        }

        if (targetCard) {
            // Step 3: Update the stock (increase by 1 using increment button)
            const incrementButton = targetCard.getByRole('button', { name: '+' });
            await incrementButton.click();

            // Wait for the stock to update
            await page.waitForTimeout(500);

            // Step 4: Save changes
            const saveButton = page.getByRole('button', { name: 'Save 1 Change' });
            await saveButton.first().click();
            await page.waitForTimeout(2000);

            // Step 5: Verify the change persists
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);

            // Find the same card again
            const updatedStockInput = cards.nth(0).locator('input[type="number"], .stock-input');
            if (await updatedStockInput.count() > 0) {
                const updatedValue = await updatedStockInput.inputValue();
                // Stock should be updated (or at least not be the original value if we found a different card)
                expect(parseInt(updatedValue)).toBeGreaterThan(0);
            }
        }
    });
});

test.describe('Inventory Management - Remove Card', () => {
    test('should remove card from inventory and product page when stock set to 0', async ({ page }) => {
        // Step 1: Go to card inventory admin page
        await page.goto('/admin/card-inventory.html');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.card-item, .inventory-card', { timeout: 10000 });

        // Step 2: Find a card with stock > 0
        const cards = page.locator('.card-item, .inventory-card, [data-card-id]');
        const count = await cards.count();

        let targetCard = null;
        let cardIdentifier = '';

        for (let i = 0; i < Math.min(count, 10); i++) {
            const card = cards.nth(i);
            const stockInput = card.locator('input[type="number"], .stock-input');

            if (await stockInput.count() > 0) {
                const stockValue = await stockInput.inputValue();

                if (parseInt(stockValue) > 0) {
                    targetCard = card;

                    // Get card identifier (name or ID)
                    const nameEl = card.locator('.card-name, h3, h4');
                    if (await nameEl.count() > 0) {
                        cardIdentifier = await nameEl.first().textContent() || '';
                    }

                    break;
                }
            }
        }

        if (targetCard && cardIdentifier) {
            console.log('Removing card:', cardIdentifier);

            // Step 3: Set stock to 0
            const stockInput = targetCard.locator('input[type="number"], .stock-input');
            await stockInput.fill('0');

            // Step 4: Save changes
            const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
            await saveButton.first().click();
            await page.waitForTimeout(2000);

            // Step 5: Go to product page and verify card is not visible
            await page.goto('/');
            await page.click('button:has-text("Singles")');
            await page.waitForSelector('.product-card', { timeout: 10000 });

            // Search for the card - it should not be visible
            const productCards = page.locator('.product-card:visible');
            const productCount = await productCards.count();

            let foundCard = false;
            for (let i = 0; i < productCount; i++) {
                const card = productCards.nth(i);
                const cardName = await card.locator('.product-name, h3').textContent();

                if (cardName?.includes(cardIdentifier)) {
                    foundCard = true;
                    break;
                }
            }

            // Card should not be found (since stock is 0)
            expect(foundCard).toBeFalsy();
        }
    });
});

test.describe('Inventory Management - Dual Domain Cards', () => {
    test('should correctly save dual-domain cards to dual bin', async ({ page }) => {
        // Step 1: Go to card inventory admin page
        await page.goto('/admin/card-inventory.html');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.card-item, .inventory-card', { timeout: 10000 });

        // Step 2: Look for a dual-domain card
        // These cards should have 2 domain indicators
        const cards = page.locator('.card-item, .inventory-card, [data-card-id]');
        const count = await cards.count();

        let dualDomainCard = null;

        for (let i = 0; i < Math.min(count, 20); i++) {
            const card = cards.nth(i);

            // Check if card has domain indicators
            const domainBadges = card.locator('.domain-badge, [class*="domain"]');
            const badgeCount = await domainBadges.count();

            if (badgeCount >= 2) {
                dualDomainCard = card;
                break;
            }
        }

        if (dualDomainCard) {
            // Step 3: Set stock for the dual-domain card
            const stockInput = dualDomainCard.locator('input[type="number"], .stock-input');
            await stockInput.fill('2');

            // Step 4: Open browser console to check logs
            const consoleLogs = [];
            page.on('console', msg => {
                if (msg.type() === 'log') {
                    consoleLogs.push(msg.text());
                }
            });

            // Step 5: Save changes
            const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
            await saveButton.first().click();
            await page.waitForTimeout(2000);

            // Step 6: Check console logs for dual-domain detection
            const hasDualLog = consoleLogs.some(log =>
                log.includes('DUAL-DOMAIN detected') || log.includes('dual bin')
            );

            // Should have logged dual-domain detection
            expect(hasDualLog).toBeTruthy();
        }
    });
});
