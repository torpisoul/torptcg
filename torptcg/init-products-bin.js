// Initialize Products Bin
// This script creates an empty products array in JSONBin

const https = require('https');

// Get from environment or config
let config = {};
try {
    config = require('./netlify/functions/config.js');
} catch (e) {
    console.log('No config.js found, using environment variables');
}

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || config.JSONBIN_API_KEY;
const PRODUCTS_BIN_ID = process.env.PRODUCTS_BIN_ID || config.PRODUCTS_BIN_ID || '6930a9c3d0ea881f4010f6d3';

if (!JSONBIN_API_KEY) {
    console.error('❌ JSONBIN_API_KEY not set!');
    console.error('Set it in your .env file or environment variables');
    process.exit(1);
}

console.log('🔧 Initializing Products Bin...');
console.log(`Bin ID: ${PRODUCTS_BIN_ID}`);

// Initialize with empty array
const initialData = [];

const payload = JSON.stringify(initialData);

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
            console.log('✅ Products bin initialized successfully!');
            console.log('You can now add products via the admin panel.');
        } else {
            console.error(`❌ Error: HTTP ${res.statusCode}`);
            console.error(data);

            if (res.statusCode === 404) {
                console.error('\n⚠️  Bin not found. You may need to create it first.');
                console.error('Go to https://jsonbin.io and create a new bin.');
                console.error('Then update PRODUCTS_BIN_ID in your .env file.');
            }
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error);
});

req.write(payload);
req.end();
