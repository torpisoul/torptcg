const { scrapeEbayPrices } = require('./scrape-ebay');
const fs = require('fs');
const path = require('path');

// Configuration
const INVENTORY_FILE = path.join(__dirname, 'inventory.json'); // We'll update this or create a new file
const PRICE_HISTORY_FILE = path.join(__dirname, 'price-history.json');

async function updateCardPrices() {
    console.log('🚀 Starting card price update...');

    // Load card inventory
    // In a real scenario, this would fetch from JSONBin.
    // Since the server is down and I cannot fetch safely, I will use a sample list of cards
    // based on what I saw in previous logs/files.

    // Simulating fetching cards from the system
    const cardsToUpdate = [
        { id: 'ogn-076-298', name: 'Yasuo, Remorseful', set: 'Origins', code: 'OGN-076/298' },
        { id: 'ogs-004-024', name: 'Yi, Meditative', set: 'Proving Grounds', code: 'OGS-004/024' },
        { id: 'ogn-001-298', name: 'Ahri', set: 'Origins', code: 'OGN-001/298' },
        { id: 'ogn-123-298', name: 'Teemo', set: 'Origins', code: 'OGN-123/298' }
    ];

    // Load existing price history if exists
    let priceHistory = {};
    if (fs.existsSync(PRICE_HISTORY_FILE)) {
        try {
            priceHistory = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf8'));
        } catch (e) {
            console.error('Error reading price history, starting fresh.');
        }
    }

    const today = new Date().toISOString().split('T')[0];
    const updates = [];

    for (const card of cardsToUpdate) {
        console.log(`\nProcessing ${card.name}...`);

        // delay to be polite (even though we are mocked mostly now)
        await new Promise(resolve => setTimeout(resolve, 1000));

        const avgPrice = await scrapeEbayPrices(card.name, card.code);

        if (avgPrice !== null) {
            // Record history
            if (!priceHistory[card.id]) {
                priceHistory[card.id] = [];
            }

            // Add new entry
            priceHistory[card.id].push({
                date: today,
                price: avgPrice
            });

            // Keep only last 30 entries
            if (priceHistory[card.id].length > 30) {
                priceHistory[card.id] = priceHistory[card.id].slice(-30);
            }

            updates.push({
                cardId: card.id,
                name: card.name,
                newPrice: avgPrice
            });

            console.log(`Updated ${card.name}: £${avgPrice}`);
        }
    }

    // Save price history
    fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(priceHistory, null, 2));
    console.log(`\n✅ Saved price history to ${PRICE_HISTORY_FILE}`);

    // In a real app, we would push these updates to JSONBin here.
    // For now, we'll save to a local 'current-prices.json' which the widget can read (mocked)
    const currentPrices = {};
    Object.keys(priceHistory).forEach(id => {
        const history = priceHistory[id];
        if (history.length > 0) {
            currentPrices[id] = history[history.length - 1].price;
        }
    });

    fs.writeFileSync(path.join(__dirname, 'current-prices.json'), JSON.stringify(currentPrices, null, 2));
    console.log(`✅ Saved current prices to current-prices.json`);

    return updates;
}

if (require.main === module) {
    updateCardPrices();
}
