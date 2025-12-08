const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Go to the local server
        await page.goto('http://localhost:8080');

        // Click on "Singles" to show filters
        await page.click('button:text("Singles")');

        // Wait for the show filters button to appear
        await page.waitForSelector('#toggle-search');

        // Click "Show Filters"
        await page.click('#toggle-search');

        // Wait for the card search panel to be visible
        await page.waitForSelector('#card-search-panel', { state: 'visible' });

        // Scroll to the search panel to make sure it's in view
        const searchPanel = await page.locator('#card-search-panel');
        await searchPanel.scrollIntoViewIfNeeded();

        // Fill in the price filter
        await page.fill('#price-min', '10');
        await page.fill('#price-max', '50');

        // Click apply filters
        await page.click('#apply-card-filters');

        // Wait for results to update (you might need a better wait condition here depending on how the app updates)
        // For now, let's wait a bit for the JS to process and render
        await page.waitForTimeout(2000);

        // Take a screenshot
        await page.screenshot({ path: path.join(__dirname, 'verification.png'), fullPage: true });

        console.log('Verification screenshot captured.');

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await browser.close();
    }
})();
