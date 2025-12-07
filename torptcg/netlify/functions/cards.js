// Netlify Function: cards
// Serves card gallery data from JSONBin (split by domain)
// Aggregates data from multiple bins

let config = {};
try {
    config = require('./config.js');
} catch (e) {
    // config.js not found, rely on process.env
}

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || config.JSONBIN_API_KEY;

// Bin IDs for each domain
const DOMAIN_BINS = {
    "calm": "692da2d1d0ea881f400b9ff3",
    "fury": "692da2d2d0ea881f400b9ff6",
    "order": "692da2d3d0ea881f400b9ffc",
    "chaos": "692da2d443b1c97be9d09818",
    "mind": "692da2d543b1c97be9d0981c",
    "body": "692da2d6d0ea881f400ba004",
    "dual": "692da2d7d0ea881f400ba009"
};

// Cache the card data in memory
let cardCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function fetchBin(binId, apiKey) {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
            headers: {
                'X-Access-Key': apiKey
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch bin ${binId}: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const record = data.record || data;

        // Handle different structures
        if (record.cards && Array.isArray(record.cards)) {
            return record.cards;
        } else if (Array.isArray(record)) {
            return record;
        } else if (record.page && record.page.cards && record.page.cards.items) {
            return record.page.cards.items;
        } else if (record.page && record.page.cards) {
            // New structure might be here
             return record.page.cards;
        } else if (record.items) {
             return record.items;
        }

        // Deep inspection for nested items
        if (JSON.stringify(record).includes('"items":[')) {
             // Fallback: try to find the array of items
             // Note: This is a hacky way to find where the items are
             if (record.page && record.page.cards && Array.isArray(record.page.cards.items)) return record.page.cards.items;
        }

        console.log(`Bin ${binId} structure unknown:`, Object.keys(record));
        return [];
    } catch (error) {
        console.error(`Error fetching bin ${binId}:`, error);
        return [];
    }
}

async function loadCardData() {
    const now = Date.now();
    const apiKey = process.env.JSONBIN_API_KEY || config.JSONBIN_API_KEY;

    // Return cached data if still valid
    if (cardCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('Returning cached card data');
        return cardCache;
    }

    console.log('Fetching card data from JSONBin...');

    const promises = Object.entries(DOMAIN_BINS).map(([domain, binId]) =>
        fetchBin(binId, apiKey).then(cards => ({ domain, cards }))
    );

    const results = await Promise.all(promises);
    let allCards = [];

    results.forEach(({ domain, cards }) => {
        if (cards && cards.length > 0) {
            console.log(`  Loaded ${cards.length} ${domain} cards`);
            allCards = allCards.concat(cards);
        }
    });

    // Wrap in the expected structure
    const cardData = {
        page: {
            cards: {
                items: allCards
            }
        }
    };

    // Update cache
    cardCache = cardData;
    cacheTimestamp = now;

    console.log(`Total cards loaded: ${allCards.length}`);

    return cardData;
}

exports.handler = async function (event, context) {
    console.log("Cards function invoked (JSONBin version)");

    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const cardData = await loadCardData();

        if (!cardData.page.cards.items || cardData.page.cards.items.length === 0) {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({
                    error: "No card data available",
                    message: "Card bins returned empty data"
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(cardData)
        };

    } catch (err) {
        console.error("Error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Internal server error",
                message: err.message
            })
        };
    }
};
