// tests/basket.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Shopping Basket', () => {
  test.beforeEach(async ({ page }) => {
    // Go to home page
    await page.goto('http://localhost:8080');
    // Clear local storage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should add item to basket and update badge', async ({ page }) => {
    // Wait for products to load
    await page.waitForSelector('.product-card');

    // Find first product card
    const firstProductCard = page.locator('.product-card').first();

    // Hover over the card to reveal the button
    await firstProductCard.hover();

    // Find add to cart button within the card
    const firstProductBtn = firstProductCard.locator('.btn-add');
    await expect(firstProductBtn).toBeVisible();

    // Click add to cart
    await firstProductBtn.click();

    // Verify badge updates
    const badge = page.locator('#basket-count-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('1');

    // Verify local storage
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('torptcg_basket')));
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
  });

  test('should open basket modal and display items', async ({ page }) => {
    // Add item first
    await page.waitForSelector('.product-card');
    const card = page.locator('.product-card').first();
    await card.hover();
    await card.locator('.btn-add').click();

    // Click basket icon
    await page.locator('#shopping-cart-icon').click();

    // Verify modal opens
    const modal = page.locator('#basket-modal');
    await expect(modal).toBeVisible();

    // Verify item in modal
    const basketItem = page.locator('.basket-item');
    await expect(basketItem).toHaveCount(1);
  });

  test('should increment and decrement quantity in basket', async ({ page }) => {
    // Add item first
    await page.waitForSelector('.product-card');
    const card = page.locator('.product-card').first();
    await card.hover();
    await card.locator('.btn-add').click();

    // Open modal
    await page.locator('#shopping-cart-icon').click();

    // Click increment
    await page.getByRole('button', { name: '+', exact: true }).click();

    // Verify quantity in UI
    await expect(page.locator('.basket-item-qty')).toHaveText('2');

    // Verify badge
    await expect(page.locator('#basket-count-badge')).toHaveText('2');

    // Click decrement
    await page.getByRole('button', { name: '-', exact: true }).click();
    await expect(page.locator('.basket-item-qty')).toHaveText('1');
  });

  test('should remove item from basket', async ({ page }) => {
    // Add item first
    await page.waitForSelector('.product-card');
    const card = page.locator('.product-card').first();
    await card.hover();
    await card.locator('.btn-add').click();

    // Open modal
    await page.locator('#shopping-cart-icon').click();

    // Click remove (using class since text is &times;)
    await page.locator('.btn-remove').click();

    // Verify empty state
    await expect(page.locator('.basket-empty')).toBeVisible();
    await expect(page.locator('.basket-item')).toHaveCount(0);

    // Verify badge hidden or 0
    await expect(page.locator('#basket-count-badge')).not.toBeVisible();
  });
});
