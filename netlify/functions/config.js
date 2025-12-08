// config.js for Netlify Functions
// Export configuration for all functions

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_INVENTORY_BIN = process.env.JSONBIN_INVENTORY_BIN || "https://api.jsonbin.io/v3/b/6927370eae596e708f7294be";

if (!JSONBIN_API_KEY) {
    console.warn('⚠️  WARNING: JSONBIN_API_KEY not set in environment variables.');
    console.warn('   Create a .env file in the project root with:');
    console.warn('   JSONBIN_API_KEY=your_api_key_here');
}

module.exports = {
    // JSONBin API Key
    JSONBIN_API_KEY: JSONBIN_API_KEY,

    // Inventory Bins
    EXTERNAL_JSON_URL: JSONBIN_INVENTORY_BIN,
    MASTER_INVENTORY_BIN_ID: process.env.MASTER_INVENTORY_BIN_ID || null,
    // Fix: Use the correct product bin ID (from env or hardcoded fallback that works)
    PRODUCTS_BIN_ID: process.env.PRODUCTS_BIN_ID || process.env.PRODUCTS_BIN_I || '692ec5feae596e708f7e5206',

    // Card Gallery Bins
    CARD_GALLERY_BIN: process.env.CARD_GALLERY_BIN || null,

    // Domain-specific card bins
    CALM_BIN_ID: process.env.CALM_BIN_ID || null,
    FURY_BIN_ID: process.env.FURY_BIN_ID || null,
    ORDER_BIN_ID: process.env.ORDER_BIN_ID || null,
    CHAOS_BIN_ID: process.env.CHAOS_BIN_ID || null,
    MIND_BIN_ID: process.env.MIND_BIN_ID || null,
    BODY_BIN_ID: process.env.BODY_BIN_ID || null,
    DUAL_BIN_ID: process.env.DUAL_BIN_ID || null
};
