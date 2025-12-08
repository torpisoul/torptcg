
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to the local server
  await page.goto('http://localhost:8080');

  // Check if products are loaded (fetchProducts call)
  try {
    // Wait for product grid to be populated
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Check if "Singles" category loads (fetchCards call via interaction)
    const singlesBtn = page.locator('button.filter-btn', { hasText: 'Singles' });
    await singlesBtn.click();

    // Wait for cards to load
    await page.waitForSelector('.card-gallery-grid .product-card', { timeout: 10000 });

    console.log('Products and Cards loaded successfully via Client API');

  } catch (e) {
    console.error('Verification failed:', e);
  }

  // Take a screenshot
  await page.screenshot({ path: 'verification.png', fullPage: true });

  await browser.close();
})();
