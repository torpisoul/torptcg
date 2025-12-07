// Debug function to check master inventory contents
const https = require('https');

exports.handler = async function (event, context) {
    const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
    const MASTER_INVENTORY_BIN_ID = process.env.MASTER_INVENTORY_BIN_ID;

    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    if (!JSONBIN_API_KEY || !MASTER_INVENTORY_BIN_ID) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Missing config' })
        };
    }

    const url = `https://api.jsonbin.io/v3/b/${MASTER_INVENTORY_BIN_ID}`;

    return new Promise((resolve) => {
        const options = {
            headers: {
                'X-Access-Key': JSONBIN_API_KEY
            }
        };

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const inventory = parsed.record?.inventory || parsed.inventory || [];

                    // Find dual-domain entries
                    const dualEntries = inventory.filter(item => item.binId === '692da2d7d0ea881f400ba009');

                    resolve({
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            totalItems: inventory.length,
                            dualDomainEntries: dualEntries,
                            allEntries: inventory
                        }, null, 2)
                    });
                } catch (err) {
                    resolve({
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ error: err.message, rawData: data })
                    });
                }
            });
        }).on('error', (err) => {
            resolve({
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: err.message })
            });
        });
    });
};
