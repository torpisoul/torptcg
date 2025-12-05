// Debug script to check the dual bin structure
const https = require('https');

exports.handler = async function (event, context) {
    const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
    const DUAL_BIN_ID = process.env.DUAL_BIN_ID || '692da2d7d0ea881f400ba009';

    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    if (!JSONBIN_API_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Missing API key' })
        };
    }

    const url = `https://api.jsonbin.io/v3/b/${DUAL_BIN_ID}`;

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
                console.log('Dual bin response status:', res.statusCode);
                console.log('Dual bin response data:', data);

                resolve({
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        statusCode: res.statusCode,
                        binId: DUAL_BIN_ID,
                        data: data,
                        parsed: res.statusCode === 200 ? JSON.parse(data) : null
                    }, null, 2)
                });
            });
        }).on('error', (err) => {
            resolve({
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: err.message
                })
            });
        });
    });
};
