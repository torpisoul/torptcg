// Netlify Function: products
// Handles product CRUD operations for sealed products, accessories, and 3D prints

const https = require('https');

let config = {};
try {
    config = require('./config.js');
} catch (e) {
    // config.js not found, rely on process.env
}

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || config.JSONBIN_API_KEY;
const PRODUCTS_BIN_ID = process.env.PRODUCTS_BIN_ID || config.PRODUCTS_BIN_ID;
const MASTER_INVENTORY_BIN_ID = process.env.MASTER_INVENTORY_BIN_ID || config.MASTER_INVENTORY_BIN_ID;

exports.handler = async function (event, context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (!JSONBIN_API_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'JSONBIN_API_KEY is not configured on the server.' })
        };
    }

    // GET: Fetch all products
    if (event.httpMethod === 'GET') {
        try {
            const products = await fetchProducts(PRODUCTS_BIN_ID);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(products)
            };
        } catch (error) {
            console.error('[PRODUCTS] Fetch error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to fetch products: ' + error.message })
            };
        }
    }

    // POST: Add, update, or delete product
    if (event.httpMethod === 'POST') {
        try {
            const payload = JSON.parse(event.body);
            const { action, product, productId, binId } = payload;

            // Use binId from payload if provided, otherwise default
            // Note: In a real secure app, we might restrict which bins can be written to.
            const targetBinId = binId || PRODUCTS_BIN_ID;

            if (!action) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Action is required' })
                };
            }

            let result;
            switch (action) {
                case 'add':
                    result = await addProduct(product, targetBinId);
                    break;
                case 'update':
                    result = await updateProduct(product, targetBinId);
                    break;
                case 'delete':
                    result = await deleteProduct(productId, targetBinId);
                    break;
                default:
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Invalid action' })
                    };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        } catch (error) {
            console.error('[PRODUCTS] Operation error:', error);
            const errorMessage = error.message || 'Operation failed';

            // Check for 401 specific error
            if (errorMessage.includes('401')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Authentication failed. Please check your API Key and Bin ownership.' })
                };
            }

            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: errorMessage })
            };
        }
    }

    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};

// Fetch all products from JSONBin
async function fetchProducts(binId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.jsonbin.io',
            path: `/v3/b/${binId}/latest`,
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        const products = json.record || [];
                        // Ensure it's an array
                        resolve(Array.isArray(products) ? products : []);
                    } catch (parseError) {
                        console.error('[PRODUCTS] Parse error:', parseError);
                        resolve([]); // Return empty array on parse error
                    }
                } else if (res.statusCode === 404) {
                    console.warn(`[PRODUCTS] Bin ${binId} not found, returning empty array`);
                    resolve([]); // Return empty array if bin doesn't exist
                } else {
                    console.error(`[PRODUCTS] HTTP ${res.statusCode}: ${data}`);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`)); // Reject on other errors (like 401)
                }
            });
        });

        req.on('error', (error) => {
            console.error('[PRODUCTS] Request error:', error);
            reject(error);
        });
        req.end();
    });
}

// Update products in JSONBin
async function updateBin(products, binId) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(products);

        const options = {
            hostname: 'api.jsonbin.io',
            path: `/v3/b/${binId}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const json = JSON.parse(data);
                    resolve(json.record);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Add new product
async function addProduct(product, binId) {
    if (!product || !product.id) {
        throw new Error('Product data with ID is required');
    }

    // 1. Update Product Bin
    const products = await fetchProducts(binId).catch(err => {
        // If 404 (handled in fetchProducts but rejected if other error),
        // we might want to start fresh if it's a new bin?
        // fetchProducts currently resolves [] on 404.
        // If it rejected, it's likely 401 or network error.
        throw err;
    });

    // Check if product already exists
    if (products.find(p => p.id === product.id)) {
        throw new Error('Product with this ID already exists');
    }

    products.push(product);
    await updateBin(products, binId);
    console.log(`[PRODUCTS] Added product ${product.id} to bin ${binId}`);

    // 2. Update Master Inventory
    if (MASTER_INVENTORY_BIN_ID) {
        try {
            await addToMasterInventory(product, binId);
        } catch (err) {
            console.error('[PRODUCTS] Failed to update Master Inventory:', err);
            // Don't fail the whole request if master inventory update fails, but log it.
            // Or should we fail? Better to warn.
        }
    }

    return { success: true, product };
}

// Update existing product
async function updateProduct(product, binId) {
    if (!product || !product.id) {
        throw new Error('Product data with ID is required');
    }

    // 1. Update Product Bin
    const products = await fetchProducts(binId);
    const index = products.findIndex(p => p.id === product.id);

    if (index === -1) {
        throw new Error('Product not found');
    }

    products[index] = { ...products[index], ...product };
    await updateBin(products, binId);
    console.log(`[PRODUCTS] Updated product ${product.id} in bin ${binId}`);

    // 2. Update Master Inventory (Stock/Category might have changed)
    if (MASTER_INVENTORY_BIN_ID) {
        try {
            await updateInMasterInventory(product, binId);
        } catch (err) {
            console.error('[PRODUCTS] Failed to update Master Inventory:', err);
        }
    }

    return { success: true, product: products[index] };
}

// Delete product
async function deleteProduct(productId, binId) {
    if (!productId) {
        throw new Error('Product ID is required');
    }

    // 1. Update Product Bin
    const products = await fetchProducts(binId);
    const index = products.findIndex(p => p.id === productId);

    if (index === -1) {
        throw new Error('Product not found');
    }

    const deleted = products.splice(index, 1)[0];
    await updateBin(products, binId);
    console.log(`[PRODUCTS] Deleted product ${productId} from bin ${binId}`);

    // 2. Update Master Inventory
    if (MASTER_INVENTORY_BIN_ID) {
        try {
            await deleteFromMasterInventory(productId);
        } catch (err) {
            console.error('[PRODUCTS] Failed to update Master Inventory:', err);
        }
    }

    return { success: true, deleted };
}

// --- Master Inventory Helpers ---

async function fetchMasterInventory() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.jsonbin.io',
            path: `/v3/b/${MASTER_INVENTORY_BIN_ID}/latest`,
            method: 'GET',
            headers: { 'X-Master-Key': JSONBIN_API_KEY }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        // Structure: { inventory: [...] }
                        const record = json.record || {};
                        resolve(record.inventory || []);
                    } catch (e) { resolve([]); }
                } else {
                    resolve([]); // Return empty if not found or error
                }
            });
        });
        req.on('error', () => resolve([]));
        req.end();
    });
}

async function updateMasterBin(inventory) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ inventory });
        const options = {
            hostname: 'api.jsonbin.io',
            path: `/v3/b/${MASTER_INVENTORY_BIN_ID}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve();
            else reject(new Error(`Master Inventory update failed: ${res.statusCode}`));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function addToMasterInventory(product, binId) {
    const inventory = await fetchMasterInventory();

    // Check if already exists
    const existingIndex = inventory.findIndex(i => i.productId === product.id);
    const item = {
        productId: product.id,
        binId: binId,
        category: product.category,
        stock: parseInt(product.stock || 0),
        preOrder: product.madeToOrder || product.preOrder || false
    };

    if (existingIndex >= 0) {
        inventory[existingIndex] = item;
    } else {
        inventory.push(item);
    }

    await updateMasterBin(inventory);
    console.log(`[PRODUCTS] Added ${product.id} to Master Inventory`);
}

async function updateInMasterInventory(product, binId) {
    // Same logic as add, acts as upsert
    await addToMasterInventory(product, binId);
}

async function deleteFromMasterInventory(productId) {
    const inventory = await fetchMasterInventory();
    const index = inventory.findIndex(i => i.productId === productId);

    if (index >= 0) {
        inventory.splice(index, 1);
        await updateMasterBin(inventory);
        console.log(`[PRODUCTS] Removed ${productId} from Master Inventory`);
    }
}
