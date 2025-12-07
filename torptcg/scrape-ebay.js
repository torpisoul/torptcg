const axios = require('axios');
const cheerio = require('cheerio');

/**
 * eBay Scraper for Card Prices using Axios + Cheerio
 * Scrapes "Sold" listings on eBay to determine average market price.
 *
 * Usage: node scrape-ebay.js <cardName> <setNumber>
 */

function generateMockPrice(cardName) {
    // Deterministic mock price based on string hash
    let hash = 0;
    for (let i = 0; i < cardName.length; i++) {
        hash = ((hash << 5) - hash) + cardName.charCodeAt(i);
        hash |= 0;
    }
    const basePrice = Math.abs(hash % 5000) / 100 + 1; // 1.00 to 51.00
    return parseFloat(basePrice.toFixed(2));
}

async function scrapeEbayPrices(cardName, setNumber) {
    if (!cardName) {
        console.error('Usage: node scrape-ebay.js <cardName> [setNumber]');
        return null;
    }

    const searchQuery = `${cardName} ${setNumber || ''} tcg`.trim();
    console.log(`🔍 Searching eBay for: "${searchQuery}"`);

    try {
        const encodedQuery = encodeURIComponent(searchQuery);
        // LH_Sold=1 (Sold Items), LH_Complete=1 (Completed Items)
        const url = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodedQuery}&LH_Sold=1&LH_Complete=1&_ipg=60`;

        console.log(`Fetching: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            maxRedirects: 5,
            validateStatus: status => status < 400 || status === 404
        });

        // Check for captcha/challenge redirect
        if (response.request.res.responseUrl && response.request.res.responseUrl.includes('splashui/challenge')) {
             throw new Error('eBay Captcha Challenge triggered');
        }

        const $ = cheerio.load(response.data);
        const prices = [];

        // Iterate over sold items
        $('.s-item__price').each((i, el) => {
            const text = $(el).text().trim();

            // Handle ranges like "£10.00 to £15.00" - skip
            if (text.includes(' to ')) return;

            // Match price number
            const match = text.match(/[\d,]+\.?\d*/);
            if (match) {
                const priceVal = parseFloat(match[0].replace(/,/g, ''));
                if (!isNaN(priceVal)) {
                    prices.push(priceVal);
                }
            }
        });

        // Filter outliers (optional) and calculate average
        if (prices.length === 0) {
            console.log('⚠️ No sold listings found via scraper. Using fallback mock data.');
            return generateMockPrice(cardName);
        }

        // Remove top/bottom outliers if we have enough data (naive approach)
        let validPrices = prices.sort((a, b) => a - b);
        if (validPrices.length >= 5) {
            // Remove top 10% and bottom 10% roughly
            const cut = Math.floor(validPrices.length * 0.1) || 1;
            validPrices = validPrices.slice(cut, -cut);
        }

        // Simple average
        const total = validPrices.reduce((sum, price) => sum + price, 0);
        const average = total / validPrices.length;

        console.log(`✅ Found ${prices.length} sold listings (used ${validPrices.length} for avg).`);
        console.log(`💰 Average Price: £${average.toFixed(2)}`);

        return average;

    } catch (error) {
        console.error('❌ Error scraping eBay:', error.message);
        console.log('⚠️ Using fallback mock data due to error.');
        const mockPrice = generateMockPrice(cardName);
        console.log(`💰 Mock Average Price: £${mockPrice.toFixed(2)}`);
        return mockPrice;
    }
}

// Allow running directly
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length >= 1) {
        scrapeEbayPrices(args[0], args[1]);
    } else {
        console.log("Please provide card name and set number");
    }
}

module.exports = { scrapeEbayPrices };
