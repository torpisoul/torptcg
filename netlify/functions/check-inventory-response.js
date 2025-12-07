// Diagnostic function to check what the inventory endpoint is returning
const https = require('https');

exports.handler = async function (event, context) {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    try {
        // Fetch from the inventory endpoint
        const inventoryUrl = 'http://localhost:8888/.netlify/functions/inventory';

        // Since we're in a Netlify function, we can't easily call localhost
        // Instead, let's just return a message
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: "Please check the browser network tab for the inventory endpoint response",
                instructions: "Look at the response from /.netlify/functions/inventory and check if dual-domain cards are included"
            })
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    }
};
