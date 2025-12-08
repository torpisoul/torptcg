// Configuration for Client-Side JSONBin Access
// Migrated from Netlify Functions for GitHub Pages Hosting

window.TorptcgConfig = {
    // API Key (Exposed to client - acceptable per user request for static hosting)
    JSONBIN_API_KEY: "$2a$10$ECN7feFnPRGgVecg0Y.qo.sD4y5GnUixuGmdbKhiP2CaBJlJ1rO7a",

    // Inventory Bins
    MASTER_INVENTORY_BIN_ID: "692ed2dbae596e708f7e68f9",
    PRODUCTS_BIN_ID: "692ec5feae596e708f7e5206",

    // Domain-specific card bins
    DOMAIN_BINS: {
        "calm": "692da2d1d0ea881f400b9ff3",
        "fury": "692da2d2d0ea881f400b9ff6",
        "order": "692da2d3d0ea881f400b9ffc",
        "chaos": "692da2d443b1c97be9d09818",
        "mind": "692da2d543b1c97be9d0981c",
        "body": "692da2d6d0ea881f400ba004",
        "dual": "692da2d7d0ea881f400ba009"
    }
};
