// One-time migration script to fix dual-domain cards in master inventory
// This updates the binId for dual-domain cards from single-domain bins to the dual bin

const { fetchBin } = require('./bin-fetcher');
const https = require('https');

let config = {};
try {
    config = require('./config.js');
} catch (e) {
    // config.js not found, rely on process.env
}

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || config.JSONBIN_API_KEY;
const MASTER_INVENTORY_BIN_ID = process.env.MASTER_INVENTORY_BIN_ID || config.MASTER_INVENTORY_BIN_ID;
const DUAL_BIN_ID = process.env.DUAL_BIN_ID || config.DUAL_BIN_ID;

// Domain bin IDs
const DOMAIN_BINS = {
    'calm': process.env.CALM_BIN_ID || config.CALM_BIN_ID,
    'fury': process.env.FURY_BIN_ID || config.FURY_BIN_ID,
    'order': process.env.ORDER_BIN_ID || config.ORDER_BIN_ID,
    'chaos': process.env.CHAOS_BIN_ID || config.CHAOS_BIN_ID,
    'mind': process.env.MIND_BIN_ID || config.MIND_BIN_ID,
    'body': process.env.BODY_BIN_ID || config.BODY_BIN_ID
};

exports.handler = async function (event, context) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (!JSONBIN_API_KEY || !MASTER_INVENTORY_BIN_ID || !DUAL_BIN_ID) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Missing configuration",
                hasApiKey: !!JSONBIN_API_KEY,
                hasMasterBin: !!MASTER_INVENTORY_BIN_ID,
                hasDualBin: !!DUAL_BIN_ID
            })
        };
    }

    try {
        console.log('[FIX-DUAL] Starting migration...');

        // 1. Fetch master inventory
        const masterData = await fetchBin(MASTER_INVENTORY_BIN_ID, JSONBIN_API_KEY);
        const inventory = masterData.inventory || [];

        console.log(`[FIX-DUAL] Found ${inventory.length} items in master inventory`);

        // 2. Fetch all domain bins to check which cards are dual-domain
        const dualCardIds = new Set();

        for (const [domainName, binId] of Object.entries(DOMAIN_BINS)) {
            if (!binId) continue;

            try {
                console.log(`[FIX-DUAL] Checking ${domainName} bin ${binId}...`);
                const binData = await fetchBin(binId, JSONBIN_API_KEY);

                let cards = [];
                if (binData.page && binData.page.cards && binData.page.cards.items) {
                    cards = binData.page.cards.items;
                } else if (Array.isArray(binData)) {
                    cards = binData;
                }

                // Check each card for dual domains
                cards.forEach(card => {
                    if (card.domain && card.domain.values && card.domain.values.length > 1) {
                        dualCardIds.add(card.id || card.publicCode);
                        console.log(`[FIX-DUAL] Found dual-domain card: ${card.id || card.publicCode} (${card.name})`);
                    }
                });
            } catch (err) {
                console.error(`[FIX-DUAL] Error checking ${domainName} bin:`, err.message);
            }
        }

        console.log(`[FIX-DUAL] Found ${dualCardIds.size} dual-domain cards total`);

        // 3. Update master inventory entries for dual cards
        let updatedCount = 0;
        inventory.forEach(item => {
            if (dualCardIds.has(item.productId)) {
                const oldBinId = item.binId;
                item.binId = DUAL_BIN_ID;
                updatedCount++;
                console.log(`[FIX-DUAL] Updated ${item.productId}: ${oldBinId} → ${DUAL_BIN_ID}`);
            }
        });

        if (updatedCount === 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'No dual-domain cards found in master inventory that need updating',
                    dualCardsFound: dualCardIds.size,
                    inventorySize: inventory.length
                })
            };
        }

        // 4. Save updated master inventory
        const updateUrl = `https://api.jsonbin.io/v3/b/${MASTER_INVENTORY_BIN_ID}`;

        await new Promise((resolve, reject) => {
            const req = https.request(updateUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': JSONBIN_API_KEY
                }
            }, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Failed to update master inventory: ${res.statusCode}`));
                }
            });
            req.on('error', reject);
            req.write(JSON.stringify({ inventory }));
            req.end();
        });

        // 5. Clear cache
        const { clearCache } = require('./bin-fetcher');
        clearCache(MASTER_INVENTORY_BIN_ID);

        console.log(`[FIX-DUAL] Migration complete! Updated ${updatedCount} entries`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Successfully updated ${updatedCount} dual-domain cards`,
                dualCardsFound: dualCardIds.size,
                updatedCount: updatedCount,
                dualBinId: DUAL_BIN_ID
            })
        };

    } catch (err) {
        console.error('[FIX-DUAL] Error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Migration failed',
                message: err.message
            })
        };
    }
};
