
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

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

    await page.goto('http://localhost:8888/admin/card-inventory.html');

    // Wait for widget
    await page.waitForSelector('.price-trends-widget');
    await page.waitForTimeout(1000); // Allow chart to render

    await page.screenshot({ path: 'verification/price_widget.png', fullPage: true });

    await browser.close();
})();
