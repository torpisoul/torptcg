// Netlify Function: inventory (Unified Architecture)
// Fetches from master inventory bin and enriches with product data from multiple bins

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

exports.handler = async function (event, context) {
    console.log("[INVENTORY] Function invoked");
    console.log("[INVENTORY] Method:", event.httpMethod);

    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (!JSONBIN_API_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "JSONBIN_API_KEY not configured" })
        };
    }

    if (!MASTER_INVENTORY_BIN_ID) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "MASTER_INVENTORY_BIN_ID not configured" })
        };
    }

    try {
        // ============================================
        // GET: Fetch enriched inventory
        // ============================================
        if (event.httpMethod === 'GET') {
            console.log("[INVENTORY] Fetching master inventory...");

            // 1. Fetch master inventory
            const masterData = await fetchBin(MASTER_INVENTORY_BIN_ID, JSONBIN_API_KEY);
            const inventory = masterData.inventory || [];

            console.log(`[INVENTORY] Found ${inventory.length} items in master inventory`);

            if (inventory.length === 0) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify([])
                };
            }

            // 2. Group items by binId
            const binGroups = {};
            inventory.forEach(item => {
                if (!binGroups[item.binId]) {
                    binGroups[item.binId] = [];
                }
                binGroups[item.binId].push(item);
            });

            console.log(`[INVENTORY] Grouped into ${Object.keys(binGroups).length} bins`);

            // 3. Fetch each bin and merge with inventory data
            const productPromises = Object.entries(binGroups).map(async ([binId, items]) => {
                try {
                    console.log(`[INVENTORY] Fetching bin ${binId} for ${items.length} items`);
                    const binData = await fetchBin(binId, JSONBIN_API_KEY);

                    // Handle different bin structures
                    let products = [];
                    if (binData.products && Array.isArray(binData.products)) {
                        products = binData.products;
                    } else if (Array.isArray(binData)) {
                        products = binData;
                    } else if (binData.page && binData.page.cards && binData.page.cards.items) {
                        // Card bin structure
                        products = binData.page.cards.items;
                    } else if (binData.cards && Array.isArray(binData.cards)) {
                        products = binData.cards;
                    }

                    // Merge inventory data with product data
                    return items.map(invItem => {
                        const product = products.find(p =>
                            p.id === invItem.productId ||
                            p.publicCode === invItem.productId
                        );

                        if (!product) {
                            console.warn(`[INVENTORY] Product ${invItem.productId} not found in bin ${binId}`);
                            return null;
                        }

                        // Normalize properties for frontend
                        const title = product.title || product.name;
                        const image = product.image || (product.cardImage ? product.cardImage.url : '');

                        // Price priority: master inventory price > product bin price > default (0.50 for singles)
                        let price = 0;
                        if (invItem.price !== undefined && invItem.price !== null) {
                            price = invItem.price;
                        } else if (product.price !== undefined) {
                            price = product.price;
                        } else if (invItem.category === 'singles') {
                            price = 0.50; // Default price for singles
                        }

                        return {
                            ...product,
                            title: title,
                            image: image,
                            price: price,
                            stock: invItem.stock,
                            category: invItem.category,
                            available: invItem.stock > 0,
                            preOrder: invItem.preOrder || false
                        };
                    }).filter(p => p !== null);

                } catch (err) {
                    console.error(`[INVENTORY] Error fetching bin ${binId}:`, err.message);
                    return [];
                }
            });

            const productArrays = await Promise.all(productPromises);
            const allProducts = productArrays.flat();

            console.log(`[INVENTORY] Returning ${allProducts.length} enriched products`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(allProducts)
            };
        }

        // ============================================
        // POST: Update stock in master inventory
        // ============================================
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { productId, stock, action, delta } = body;

            console.log(`[INVENTORY] Update request: ${action || (delta ? 'adjust' : 'unknown')} for ${productId}`);

            // Fetch current master inventory
            const masterData = await fetchBin(MASTER_INVENTORY_BIN_ID, JSONBIN_API_KEY);
            const inventory = masterData.inventory || [];

            // Find the item
            const itemIndex = inventory.findIndex(item => item.productId === productId);

            // Handle 'adjust' action (or implicit delta)
            if ((action === 'adjust' || (!action && delta !== undefined)) && delta !== undefined) {
                if (itemIndex >= 0) {
                    const oldStock = inventory[itemIndex].stock;
                    const change = parseInt(delta);
                    const newStock = Math.max(0, oldStock + change); // Prevent negative stock

                    inventory[itemIndex].stock = newStock;
                    console.log(`[INVENTORY] Adjusted ${productId}: ${oldStock} + (${change}) = ${newStock}`);

                    // Remove from inventory if stock reaches 0 (optional, keeping it for now but marking as 0)
                    // If you want to remove it:
                    /*
                    if (newStock <= 0) {
                        inventory.splice(itemIndex, 1);
                        console.log(`[INVENTORY] Removed ${productId} (stock depleted)`);
                    }
                    */
                } else {
                    console.warn(`[INVENTORY] Product ${productId} not found for adjustment`);
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: "Product not found" })
                    };
                }
            }
            // Handle 'create' action (Dual Write: Product Bin + Master Inventory)
            else if (action === 'create' && body.product && body.binId) {
                console.log(`[INVENTORY] Creating new product in bin ${body.binId}`);

                // 1. Fetch target product bin
                const binData = await fetchBin(body.binId, JSONBIN_API_KEY);
                let products = [];
                let isWrapped = false;

                if (binData.products && Array.isArray(binData.products)) {
                    products = binData.products;
                    isWrapped = true;
                } else if (Array.isArray(binData)) {
                    products = binData;
                }

                // 2. Add new product to list
                products.push(body.product);

                // 3. Save updated product list to bin
                const updateBinUrl = `https://api.jsonbin.io/v3/b/${body.binId}`;
                await new Promise((resolve, reject) => {
                    const req = https.request(updateBinUrl, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Access-Key': JSONBIN_API_KEY
                        }
                    }, (res) => {
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
                        else reject(new Error(`Failed to update product bin: ${res.statusCode}`));
                    });
                    req.on('error', reject);
                    req.write(JSON.stringify(isWrapped ? { products } : products));
                    req.end();
                });

                // 4. Add to master inventory
                inventory.push({
                    productId: body.product.id,
                    binId: body.binId,
                    category: body.product.category,
                    stock: parseInt(body.product.stock),
                    preOrder: body.product.preOrder || false
                });

                console.log(`[INVENTORY] Added ${body.product.id} to master inventory`);
            }
            // Handle 'set' action (Stock and Price Update)
            else if (action === 'set' && stock !== undefined) {
                if (itemIndex >= 0) {
                    // Update existing item
                    const oldStock = inventory[itemIndex].stock;
                    const oldBinId = inventory[itemIndex].binId;
                    inventory[itemIndex].stock = parseInt(stock);

                    // Update price if provided
                    if (body.price !== undefined) {
                        const oldPrice = inventory[itemIndex].price;
                        inventory[itemIndex].price = parseFloat(body.price);
                        if (oldPrice !== body.price) {
                            console.log(`[INVENTORY] Updated ${productId} price: ${oldPrice} → ${body.price}`);
                        }
                    }

                    // Update binId if provided (important for dual-domain cards that may have been miscategorized)
                    if (body.binId) {
                        inventory[itemIndex].binId = body.binId;
                        if (oldBinId !== body.binId) {
                            console.log(`[INVENTORY] Updated ${productId} binId: ${oldBinId} → ${body.binId}`);
                        }
                    }

                    // Remove from inventory if stock is 0
                    if (inventory[itemIndex].stock <= 0) {
                        inventory.splice(itemIndex, 1);
                        console.log(`[INVENTORY] Removed ${productId} (stock depleted)`);
                    } else {
                        console.log(`[INVENTORY] Updated ${productId}: ${oldStock} → ${stock}`);
                    }
                } else if (stock > 0) {
                    // Add new item (requires binId and category in request)
                    if (!body.binId || !body.category) {
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ error: "binId and category required for new items" })
                        };
                    }

                    inventory.push({
                        productId,
                        binId: body.binId,
                        category: body.category,
                        stock: parseInt(stock),
                        price: body.price !== undefined ? parseFloat(body.price) : 0.50,
                        preOrder: body.preOrder || false
                    });

                    console.log(`[INVENTORY] Added ${productId} with stock ${stock} and price ${body.price || 0.50}`);
                }
            }
            // Handle 'delete' action
            else if (action === 'delete') {
                if (itemIndex >= 0) {
                    inventory.splice(itemIndex, 1);
                    console.log(`[INVENTORY] Deleted ${productId} from master inventory`);
                }

                // Note: We are NOT deleting from the product bin to be safe, 
                // but we could if we wanted to be thorough.
            }

            // Save back to master inventory bin
            const updateUrl = `https://api.jsonbin.io/v3/b/${MASTER_INVENTORY_BIN_ID}`;

            await new Promise((resolve, reject) => {
                const req = https.request(updateUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Access-Key': JSONBIN_API_KEY
                    }
                }, (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) resolve();
                    else reject(new Error(`Failed to update master inventory: ${res.statusCode}`));
                });
                req.on('error', reject);
                req.write(JSON.stringify({ inventory }));
                req.end();
            });

            // Clear cache for modified bins
            const { clearCache } = require('./bin-fetcher');
            clearCache(MASTER_INVENTORY_BIN_ID);
            if (body.binId) clearCache(body.binId);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: "Stock updated" })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: "Method not allowed" })
        };

    } catch (err) {
        console.error("[INVENTORY] Error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal server error", message: err.message })
        };
    }
};
