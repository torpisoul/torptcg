// Client-side JSONBin Interactions
// Replaces Netlify Functions for GitHub Pages compatibility

(function() {
    // Ensure config exists
    if (!window.TorptcgConfig) {
        console.error('TorptcgConfig not found. Make sure config.js is loaded first.');
        return;
    }

    const API_KEY = window.TorptcgConfig.JSONBIN_API_KEY;
    const MASTER_INVENTORY_BIN_ID = window.TorptcgConfig.MASTER_INVENTORY_BIN_ID;
    const DOMAIN_BINS = window.TorptcgConfig.DOMAIN_BINS;

    // Cache for bin data
    const binCache = new Map();
    const CACHE_DURATION = 300000; // 5 minutes

    const TorptcgAPI = {
        /**
         * Fetch data from a JSONBin
         * @param {string} binId
         * @param {boolean} forceRefresh
         */
        fetchBin: async function(binId, forceRefresh = false) {
            // Check cache
            if (!forceRefresh) {
                const cached = binCache.get(binId);
                if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                    return cached.data;
                }
            }

            try {
                const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                    headers: {
                        'X-Access-Key': API_KEY
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch bin ${binId}: ${response.status}`);
                }

                const data = await response.json();
                const record = data.record || data;

                // Update cache
                binCache.set(binId, {
                    data: record,
                    timestamp: Date.now()
                });

                return record;
            } catch (error) {
                console.error(`Error fetching bin ${binId}:`, error);
                throw error;
            }
        },

        /**
         * Update a bin
         * @param {string} binId
         * @param {object} data
         */
        updateBin: async function(binId, data) {
            try {
                const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Access-Key': API_KEY
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(`Failed to update bin ${binId}: ${response.status}`);
                }

                const result = await response.json();

                // Update cache
                binCache.set(binId, {
                    data: data,
                    timestamp: Date.now()
                });

                return result;
            } catch (error) {
                console.error(`Error updating bin ${binId}:`, error);
                throw error;
            }
        },

        /**
         * Fetch enriched products (Master Inventory + Product Details)
         * Replaces `/.netlify/functions/inventory` (GET)
         */
        fetchProducts: async function() {
            try {
                // 1. Fetch master inventory
                const masterData = await this.fetchBin(MASTER_INVENTORY_BIN_ID);
                const inventory = masterData.inventory || [];

                if (inventory.length === 0) return [];

                // 2. Group items by binId
                const binGroups = {};
                inventory.forEach(item => {
                    if (!item.binId) return;
                    if (!binGroups[item.binId]) {
                        binGroups[item.binId] = [];
                    }
                    binGroups[item.binId].push(item);
                });

                // 3. Fetch each bin and merge with inventory data
                const productPromises = Object.entries(binGroups).map(async ([binId, items]) => {
                    try {
                        const binData = await this.fetchBin(binId);

                        // Handle different bin structures
                        let products = [];
                        if (binData.products && Array.isArray(binData.products)) {
                            products = binData.products;
                        } else if (Array.isArray(binData)) {
                            products = binData;
                        } else if (binData.page && binData.page.cards && binData.page.cards.items) {
                            products = binData.page.cards.items;
                        } else if (binData.cards && Array.isArray(binData.cards)) {
                            products = binData.cards;
                        }

                        // Merge
                        return items.map(invItem => {
                            const product = products.find(p =>
                                p.id === invItem.productId ||
                                p.publicCode === invItem.productId
                            );

                            if (!product) return null;

                            const title = product.title || product.name;
                            const image = product.image || (product.cardImage ? product.cardImage.url : '');
                            const price = product.price !== undefined ? product.price : 0;

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
                        console.warn(`Error fetching product bin ${binId}:`, err);
                        return [];
                    }
                });

                const productArrays = await Promise.all(productPromises);
                return productArrays.flat();

            } catch (error) {
                console.error('Error fetching products:', error);
                throw error;
            }
        },

        /**
         * Fetch all cards from domain bins
         * Replaces `/.netlify/functions/cards`
         */
        fetchCards: async function() {
            try {
                const results = [];
                const entries = Object.entries(DOMAIN_BINS);

                // Fetch in parallel for client-side speed (less concern about 429 locally vs lambda)
                // But still throttle slightly if needed? JSONBin rate limit is 100/min free, or higher paid.
                // We'll do Promise.all but maybe in chunks if it fails.
                const promises = entries.map(async ([domain, binId]) => {
                    try {
                        const cards = await this.fetchBin(binId);
                        // Normalize output
                        let items = [];
                        if (cards.page && cards.page.cards && cards.page.cards.items) {
                            items = cards.page.cards.items;
                        } else if (Array.isArray(cards)) {
                            items = cards;
                        } else if (cards.cards && Array.isArray(cards.cards)) {
                            items = cards.cards;
                        }
                        return items;
                    } catch (e) {
                        console.warn(`Failed to fetch cards for ${domain}:`, e);
                        return [];
                    }
                });

                const cardArrays = await Promise.all(promises);
                const allCards = cardArrays.flat();

                return allCards;

            } catch (error) {
                console.error('Error fetching cards:', error);
                throw error;
            }
        },

        /**
         * Fetch raw master inventory (just stock levels)
         */
        fetchMasterInventory: async function() {
            const masterData = await this.fetchBin(MASTER_INVENTORY_BIN_ID);
            return masterData.inventory || [];
        },

        /**
         * Update stock
         * Replaces `/.netlify/functions/inventory` (POST)
         */
        updateStock: async function(productId, delta, action = 'adjust') {
            try {
                // 1. Fetch Master Inventory (force refresh to ensure latest state)
                const masterData = await this.fetchBin(MASTER_INVENTORY_BIN_ID, true);
                const inventory = masterData.inventory || [];

                // 2. Find Item
                const itemIndex = inventory.findIndex(item => item.productId === productId);

                if (itemIndex === -1 && action === 'adjust') {
                     return { success: false, error: 'Product not found' };
                }

                // 3. Update Logic
                if (action === 'adjust') {
                    const oldStock = inventory[itemIndex].stock;
                    const change = parseInt(delta);
                    const newStock = Math.max(0, oldStock + change);

                    if (oldStock === newStock && change !== 0 && newStock === 0) {
                         // Attempted to reduce stock below 0, or stock was already 0
                         if (change < 0) return { success: false, error: 'insufficient_stock' };
                    }

                    inventory[itemIndex].stock = newStock;
                } else if (action === 'set') {
                    const newStock = parseInt(delta); // In 'set' mode, delta is the absolute value
                    if (itemIndex >= 0) {
                         inventory[itemIndex].stock = newStock;
                    } else {
                         // Add new item logic handled in 'setStock' helper in admin
                         // For now assume update existing
                         return { success: false, error: 'Product not found for set' };
                    }
                }

                // 4. Save back
                await this.updateBin(MASTER_INVENTORY_BIN_ID, { inventory });

                return { success: true, stock: inventory[itemIndex]?.stock };

            } catch (error) {
                console.error('Error updating stock:', error);
                return { success: false, error: 'network_error', details: error.message };
            }
        },

        // Expose internal cache clearing if needed
        clearCache: function() {
            binCache.clear();
        }
    };

    // Expose global
    window.TorptcgAPI = TorptcgAPI;
})();
