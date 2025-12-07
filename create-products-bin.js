// Create New Products Bin
// This script creates a new bin in YOUR JSONBin account for products

const https = require('https');
require('dotenv').config(); // Load .env file

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;

if (!JSONBIN_API_KEY) {
    console.error('❌ JSONBIN_API_KEY not set!');
    console.error('Make sure you have a .env file with JSONBIN_API_KEY=your_key');
    process.exit(1);
}

console.log('🔧 Creating new products bin in your JSONBin account...');

// Initial data with a sample product (will be removed later)
const initialData = [
    {
        id: "sample-product",
        title: "Sample Product (Delete Me)",
        category: "accessories",
        price: 0.01,
        stock: 0,
        madeToOrder: false,
        image: "https://via.placeholder.com/300",
        description: "This is a sample product. You can delete it after adding your first real product."
    }
];

const payload = JSON.stringify(initialData);

const options = {
    hostname: 'api.jsonbin.io',
    path: '/v3/b',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
        'X-Bin-Name': 'torptcg-products',
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
            const response = JSON.parse(data);
            const binId = response.metadata.id;

            console.log('\n✅ Products bin created successfully!');
            console.log('\n📋 IMPORTANT: Add this to your .env file:');
            console.log(`\nPRODUCTS_BIN_ID=${binId}\n`);
            console.log('Replace the old PRODUCTS_BIN_ID value with this new one.');
            console.log('\nThen restart netlify dev for the changes to take effect.');
        } else {
            console.error(`❌ Error: HTTP ${res.statusCode}`);
            console.error(data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error);
});

req.write(payload);
req.end();
