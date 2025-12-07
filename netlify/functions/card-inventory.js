// const fetch = require('node-fetch'); // Using built-in fetch

// Card inventory bin ID - UPDATE THIS after creating the bin
const CARD_INVENTORY_BIN_ID = process.env.CARD_INVENTORY_BIN_ID || '692e1a8443b1c97be9d1746c';

exports.handler = async function (event) {
    // Use env var - no fallback to hardcoded key for security
    const API_KEY = process.env.JSONBIN_API_KEY;

    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured' })
        };
    }

    // GET - Fetch inventory
    if (event.httpMethod === 'GET') {
        try {
            const response = await fetch(
                `https://api.jsonbin.io/v3/b/${CARD_INVENTORY_BIN_ID}/latest`,
                {
                    headers: {
                        'X-Access-Key': API_KEY
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`JSONBin returned ${response.status}`);
            }

            const data = await response.json();

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(data.record.inventory || [])
            };
        } catch (error) {
            console.error('Error fetching card inventory:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message })
            };
        }
    }

    // POST - Update inventory
    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body);
            const { cardId, stock, action } = body;

            console.log(`Processing ${action} for card ${cardId}`);

            // Fetch current inventory
            const getResponse = await fetch(
                `https://api.jsonbin.io/v3/b/${CARD_INVENTORY_BIN_ID}/latest`,
                {
                    headers: {
                        'X-Access-Key': API_KEY
                    }
                }
            );

            if (!getResponse.ok) {
                const errorText = await getResponse.text();
                console.error(`JSONBin GET failed: ${getResponse.status} ${errorText}`);
                throw new Error(`Failed to fetch current inventory: ${getResponse.status}`);
            }

            const currentData = await getResponse.json();

            if (!currentData.record) {
                console.error('Invalid JSONBin structure:', JSON.stringify(currentData));
                throw new Error('Invalid JSONBin structure: missing record');
            }

            let inventory = currentData.record.inventory || [];

            if (action === 'set') {
                // Set stock for a card
                const existingIndex = inventory.findIndex(item => item.cardId === cardId);

                if (existingIndex >= 0) {
                    inventory[existingIndex].stock = stock;
                } else {
                    inventory.push({ cardId, stock });
                }
            } else if (action === 'increment') {
                // Increment stock
                const existingIndex = inventory.findIndex(item => item.cardId === cardId);

                if (existingIndex >= 0) {
                    inventory[existingIndex].stock += 1;
                } else {
                    inventory.push({ cardId, stock: 1 });
                }
            } else if (action === 'decrement') {
                // Decrement stock
                const existingIndex = inventory.findIndex(item => item.cardId === cardId);

                if (existingIndex >= 0) {
                    inventory[existingIndex].stock = Math.max(0, inventory[existingIndex].stock - 1);
                }
            }

            // Update JSONBin
            const updateResponse = await fetch(
                `https://api.jsonbin.io/v3/b/${CARD_INVENTORY_BIN_ID}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Access-Key': API_KEY
                    },
                    body: JSON.stringify({ inventory })
                }
            );

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.error(`JSONBin PUT failed: ${updateResponse.status} ${errorText}`);
                throw new Error(`Failed to update inventory: ${updateResponse.status}`);
            }

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ success: true, inventory })
            };
        } catch (error) {
            console.error('Error updating card inventory:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message, stack: error.stack })
            };
        }
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};
