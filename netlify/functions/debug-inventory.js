// Debug function to check master inventory structure
const https = require('https');

exports.handler = async function (event, context) {
    const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
    const MASTER_INVENTORY_BIN_ID = process.env.MASTER_INVENTORY_BIN_ID;

    console.log('API Key present:', !!JSONBIN_API_KEY);
    console.log('API Key value:', JSONBIN_API_KEY);
    console.log('Master Inventory Bin ID:', MASTER_INVENTORY_BIN_ID);

    if (!JSONBIN_API_KEY || !MASTER_INVENTORY_BIN_ID) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Missing configuration',
                hasApiKey: !!JSONBIN_API_KEY,
                hasMasterBinId: !!MASTER_INVENTORY_BIN_ID
            })
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
                console.log('Response status:', res.statusCode);
                console.log('Response data:', data);

                resolve({
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        statusCode: res.statusCode,
                        data: data,
                        apiKeyUsed: JSONBIN_API_KEY.substring(0, 20) + '...',
                        binId: MASTER_INVENTORY_BIN_ID
                    })
                });
            });
        }).on('error', (err) => {
            resolve({
                statusCode: 500,
                body: JSON.stringify({
                    error: err.message
                })
            });
        });
    });
};
