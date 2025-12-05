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

    // GET: Fetch all products
    if (event.httpMethod === 'GET') {
        try {
            const products = await fetchProducts();
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
                body: JSON.stringify({ error: 'Failed to fetch products' })
            };
        }
    }

    // POST: Add, update, or delete product
    if (event.httpMethod === 'POST') {
        try {
            const payload = JSON.parse(event.body);
            const { action, product, productId } = payload;

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
                    result = await addProduct(product);
                    break;
                case 'update':
                    result = await updateProduct(product);
                    break;
                case 'delete':
                    result = await deleteProduct(productId);
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
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: error.message || 'Operation failed' })
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
async function fetchProducts() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.jsonbin.io',
            path: `/v3/b/${PRODUCTS_BIN_ID}/latest`,
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
                    console.warn('[PRODUCTS] Bin not found, returning empty array');
                    resolve([]); // Return empty array if bin doesn't exist
                } else {
                    console.error(`[PRODUCTS] HTTP ${res.statusCode}: ${data}`);
                    resolve([]); // Return empty array on other errors
                }
            });
        });

        req.on('error', (error) => {
            console.error('[PRODUCTS] Request error:', error);
            resolve([]); // Return empty array on network error
        });
        req.end();
    });
}

// Update products in JSONBin
async function updateBin(products) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(products);

        const options = {
            hostname: 'api.jsonbin.io',
            path: `/v3/b/${PRODUCTS_BIN_ID}`,
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
async function addProduct(product) {
    if (!product || !product.id) {
        throw new Error('Product data with ID is required');
    }

    const products = await fetchProducts();

    // Check if product already exists
    if (products.find(p => p.id === product.id)) {
        throw new Error('Product with this ID already exists');
    }

    products.push(product);
    await updateBin(products);

    console.log(`[PRODUCTS] Added product: ${product.id}`);
    return { success: true, product };
}

// Update existing product
async function updateProduct(product) {
    if (!product || !product.id) {
        throw new Error('Product data with ID is required');
    }

    const products = await fetchProducts();
    const index = products.findIndex(p => p.id === product.id);

    if (index === -1) {
        throw new Error('Product not found');
    }

    products[index] = { ...products[index], ...product };
    await updateBin(products);

    console.log(`[PRODUCTS] Updated product: ${product.id}`);
    return { success: true, product: products[index] };
}

// Delete product
async function deleteProduct(productId) {
    if (!productId) {
        throw new Error('Product ID is required');
    }

    const products = await fetchProducts();
    const index = products.findIndex(p => p.id === productId);

    if (index === -1) {
        throw new Error('Product not found');
    }

    const deleted = products.splice(index, 1)[0];
    await updateBin(products);

    console.log(`[PRODUCTS] Deleted product: ${productId}`);
    return { success: true, deleted };
}
