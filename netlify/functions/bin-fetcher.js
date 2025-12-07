// Helper module for fetching and caching JSONBin data
// Used by inventory.js to fetch from multiple bins efficiently

const https = require('https');

// Cache for bin data
const binCache = new Map();
const CACHE_DURATION = 300000; // 5 minutes

/**
 * Fetch data from a JSONBin
 * @param {string} binId - The bin ID to fetch
 * @param {string} apiKey - JSONBin API key
 * @returns {Promise<any>} The bin data
 */
async function fetchBin(binId, apiKey) {
    // Check cache
    const cached = binCache.get(binId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`[CACHE HIT] Bin ${binId}`);
        return cached.data;
    }

    console.log(`[FETCHING] Bin ${binId}`);

    const url = `https://api.jsonbin.io/v3/b/${binId}`;

    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'X-Access-Key': apiKey
            }
        };

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(data);
                        const record = parsed.record || parsed;

                        // Cache the result
                        binCache.set(binId, {
                            data: record,
                            timestamp: Date.now()
                        });

                        resolve(record);
                    } catch (err) {
                        reject(new Error(`Failed to parse bin ${binId}: ${err.message}`));
                    }
                } else {
                    reject(new Error(`Failed to fetch bin ${binId}: ${res.statusCode}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Clear the cache for a specific bin or all bins
 * @param {string} [binId] - Optional bin ID to clear, or clear all if not provided
 */
function clearCache(binId) {
    if (binId) {
        binCache.delete(binId);
        console.log(`[CACHE CLEARED] Bin ${binId}`);
    } else {
        binCache.clear();
        console.log('[CACHE CLEARED] All bins');
    }
}

module.exports = {
    fetchBin,
    clearCache
};
