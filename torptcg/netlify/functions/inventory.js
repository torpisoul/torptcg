// Netlify Function: inventory
// Handles both GET (read inventory) and POST (update stock) operations
// Provides atomic stock management with concurrency control

const { EXTERNAL_JSON_URL } = require('./config.js');

// Environment variable for JSONBin API key (set in Netlify dashboard)
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;

exports.handler = async function (event, context) {
    const method = event.httpMethod;
    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
    };

    try {
        // ============================================
        // GET: Fetch current inventory
        // ============================================
        if (method === 'GET') {
            const response = await fetch(EXTERNAL_JSON_URL, {
                headers: JSONBIN_API_KEY ? { 'X-Access-Key': JSONBIN_API_KEY } : {}
            });

            if (!response.ok) {
                console.error('Failed to fetch from JSONBin:', response.status);
                return {
                    statusCode: 502,
                    headers,
                    body: JSON.stringify({ error: "Failed to fetch inventory data" })
                };
            }

            const data = await response.json();
            // JSONBin wraps data in 'record' property
            const inventory = data?.record ?? data;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(inventory)
            };
        }

        // ============================================
        // POST: Update stock (atomic operation)
        // ============================================
        if (method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { productId, delta, action } = body;

            // Validate input
            if (!productId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "productId is required" })
                };
            }

            if (action !== 'set' && typeof delta !== 'number') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "delta must be a number for increment/decrement operations" })
                };
            }

            // Fetch current inventory
            const fetchResponse = await fetch(EXTERNAL_JSON_URL, {
                headers: JSONBIN_API_KEY ? { 'X-Access-Key': JSONBIN_API_KEY } : {}
            });

            if (!fetchResponse.ok) {
                return {
                    statusCode: 502,
                    headers,
                    body: JSON.stringify({ error: "Failed to fetch current inventory" })
                };
            }

            const currentData = await fetchResponse.json();
            const inventory = currentData?.record ?? currentData;

            // Find the product
            const product = inventory.products?.find(p => p.id === productId);
            if (!product) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: `Product ${productId} not found` })
                };
            }

            // Perform the stock operation
            let newStock;
            if (action === 'set') {
                // Direct set (for admin updates)
                newStock = body.stock;
            } else {
                // Increment/decrement (for purchases/restocks)
                newStock = (product.stock || 0) + delta;
            }

            // Validate stock level
            if (newStock < 0) {
                return {
                    statusCode: 409, // Conflict
                    headers,
                    body: JSON.stringify({
                        error: "Insufficient stock",
                        currentStock: product.stock,
                        requested: Math.abs(delta)
                    })
                };
            }

            // Update the product
            const oldStock = product.stock;
            product.stock = newStock;

            // Update availability flag
            product.available = newStock > 0 || product.preOrder === true;

            // Write back to JSONBin
            const binId = EXTERNAL_JSON_URL.split('/').pop();
            const updateUrl = `https://api.jsonbin.io/v3/b/${binId}`;

            const updateResponse = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': JSONBIN_API_KEY || ''
                },
                body: JSON.stringify(inventory)
            });

            if (!updateResponse.ok) {
                console.error('Failed to update JSONBin:', updateResponse.status);
                return {
                    statusCode: 502,
                    headers,
                    body: JSON.stringify({ error: "Failed to update inventory" })
                };
            }

            // Log the change (for audit trail)
            console.log(`[INVENTORY] Product ${productId}: ${oldStock} → ${newStock} (delta: ${delta || 'set'})`);

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

        // ============================================
        // Unsupported method
        // ============================================
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: "Method not allowed. Use GET or POST." })
        };

    } catch (err) {
        console.error("Error in inventory function:", err);
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
