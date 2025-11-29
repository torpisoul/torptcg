// Netlify Function: inventory
// Handles both GET (read inventory) and POST (update stock) operations
// Uses native https module to avoid dependency issues

const https = require('https');
const { EXTERNAL_JSON_URL, JSONBIN_API_KEY: CONFIG_API_KEY } = require('./config.js');

// Environment variable for JSONBin API key (set in Netlify dashboard) or fallback to config
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || CONFIG_API_KEY;

// Helper function to make HTTP requests
function makeRequest(url, options, bodyData) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    data: data
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (bodyData) {
            req.write(bodyData);
        }
        req.end();
    });
}

exports.handler = async function (event, context) {
    console.log("Inventory function invoked (https version)");
    console.log("Method:", event.httpMethod);

    const method = event.httpMethod;
    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    if (method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // ============================================
        // GET: Fetch current inventory
        // ============================================
        if (method === 'GET') {
            const url = new URL(EXTERNAL_JSON_URL);
            const options = {
                method: 'GET',
                headers: {}
            };

            if (JSONBIN_API_KEY) {
                options.headers['X-Access-Key'] = JSONBIN_API_KEY;
            }

            const response = await makeRequest(url, options);

            if (!response.ok) {
                console.error('Failed to fetch from JSONBin:', response.status);
                return {
                    statusCode: 502,
                    headers,
                    body: JSON.stringify({ error: "Failed to fetch inventory data", details: response.data })
                };
            }

            const data = JSON.parse(response.data);
            const inventory = data?.record ?? data;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(inventory)
            };
        }

        // ============================================
        // POST: Update stock
        // ============================================
        if (method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { productId, delta, action } = body;

            if (!productId) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "productId is required" }) };
            }

            // 1. Fetch current
            const url = new URL(EXTERNAL_JSON_URL);
            const getOptions = {
                method: 'GET',
                headers: {}
            };
            if (JSONBIN_API_KEY) {
                getOptions.headers['X-Access-Key'] = JSONBIN_API_KEY;
            }

            const fetchResponse = await makeRequest(url, getOptions);
            if (!fetchResponse.ok) {
                return { statusCode: 502, headers, body: JSON.stringify({ error: "Failed to fetch current inventory" }) };
            }

            const currentData = JSON.parse(fetchResponse.data);
            const inventory = currentData?.record ?? currentData;
            const product = inventory.products?.find(p => p.id === productId);

            if (!product) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: `Product ${productId} not found` }) };
            }

            // 2. Calculate new stock
            let newStock;
            if (action === 'set') {
                newStock = body.stock;
            } else {
                newStock = (product.stock || 0) + delta;
            }

            if (newStock < 0) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: "Insufficient stock", currentStock: product.stock })
                };
            }

            const oldStock = product.stock;
            product.stock = newStock;
            product.available = newStock > 0 || product.preOrder === true;

            // 3. Update
            // Note: JSONBin V3 uses PUT to update the bin
            const binId = EXTERNAL_JSON_URL.split('/').pop();
            const updateUrl = new URL(`https://api.jsonbin.io/v3/b/${binId}`);
            const updateOptions = {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            if (JSONBIN_API_KEY) {
                updateOptions.headers['X-Access-Key'] = JSONBIN_API_KEY;
            }

            const updateResponse = await makeRequest(updateUrl, updateOptions, JSON.stringify(inventory));

            if (!updateResponse.ok) {
                console.error('Failed to update JSONBin:', updateResponse.status);
                return { statusCode: 502, headers, body: JSON.stringify({ error: "Failed to update inventory" }) };
            }

            console.log(`[INVENTORY] Product ${productId}: ${oldStock} → ${newStock}`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    product: {
                        id: product.id,
                        title: product.title,
                        oldStock,
                        newStock,
                        available: product.available
                    }
                })
            };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

    } catch (err) {
        console.error("Error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal server error", message: err.message })
        };
    }
};
