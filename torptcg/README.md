# TorpTCG - Riftbound Specialists & Custom 3D Prints

A modern e-commerce platform for trading card games, specializing in Riftbound TCG singles, sealed products, accessories, and custom 3D prints.

## Features

### Customer Features
- Browse products by category (Singles, Sealed, Accessories, 3D Prints)
- Advanced card search with filters (domain, rarity, type, energy, might)
- Full-screen card modal for detailed viewing
- Secure checkout via Stripe Payment Links
- Contact form for inquiries

### Admin Features
- Card inventory management with batch stock updates
- Product inventory management (sealed, accessories, prints)
- Real-time stock tracking
- Price management
- Visual feedback for pending changes

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Hosting**: Netlify
- **Functions**: Netlify Serverless Functions
- **Database**: JSONBin.io (product data)
- **Payments**: Stripe Payment Links
- **Auth**: Supabase (planned)

## Project Structure

```
torptcg/
├── index.html              # Main store page
├── success.html            # Payment success page
├── cancel.html             # Payment cancel page
├── script.js               # Main JavaScript
├── cards-script.js         # Card search logic
├── styles.css              # Main styles
├── cards-styles.css        # Card-specific styles
├── inventory-styles.css    # Inventory page styles
├── admin/
│   ├── card-inventory.html     # Card stock management
│   └── product-inventory.html  # Product stock management
├── lib/
│   └── supabase-client.js      # Auth client (planned)
├── styles/
│   └── auth.css                # Auth UI styles (planned)
└── netlify/
    └── functions/
        ├── inventory.js        # Inventory API
        ├── cards.js           # Card search API
        ├── products.js        # Products API
        └── stripe-webhook.js  # Payment webhook

```

## Setup

### Prerequisites
- Node.js 18+
- Netlify account
- JSONBin.io account
- Stripe account (for payments)

### Environment Variables

Create a `.env` file:

```env
# JSONBin
JSONBIN_API_KEY=your_jsonbin_api_key
MASTER_INVENTORY_BIN_ID=your_master_inventory_bin_id
PRODUCTS_BIN_ID=your_products_bin_id

# Card Bins (by domain)
CALM_BIN_ID=your_calm_cards_bin_id
FURY_BIN_ID=your_fury_cards_bin_id
ORDER_BIN_ID=your_order_cards_bin_id
CHAOS_BIN_ID=your_chaos_cards_bin_id
MIND_BIN_ID=your_mind_cards_bin_id
BODY_BIN_ID=your_body_cards_bin_id
DUAL_BIN_ID=your_dual_cards_bin_id

# Stripe (optional - for payments)
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Supabase (optional - for user auth)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Local Development

```bash
# Install dependencies
npm install

# Start Netlify Dev server
netlify dev
```

Visit `http://localhost:8888`

### Deployment

```bash
# Deploy to Netlify
netlify deploy --prod
```

**Important**: Add all environment variables in Netlify Dashboard → Site Settings → Environment Variables

## Data Structure

### Product Schema
```json
{
  "id": "product-id",
  "title": "Product Name",
  "category": "singles|sealed|accessories|prints",
  "price": 99.99,
  "stock": 5,
  "image": "https://...",
  "description": "Product description",
  "stripePaymentLink": "https://buy.stripe.com/xxxxx"
}
```

### Card Schema (Singles)
```json
{
  "id": "card-id",
  "name": "Card Name",
  "publicCode": "RFT-001",
  "set": { "value": { "id": "OGN", "label": "Origins" } },
  "domain": { "values": [{ "id": "fury", "label": "Fury" }] },
  "rarity": { "label": "Rare" },
  "cardType": { "type": [{ "label": "Unit" }] },
  "energy": { "value": 3 },
  "might": { "value": 5 },
  "cardImage": { "url": "https://..." },
  "description": "Card text"
}
```

## Features Roadmap

### Implemented ✅
- Product browsing and filtering
- Card search with advanced filters
- Full-screen card modal
- Stock management (admin)
- Batch stock updates
- Stripe payment integration
- Webhook for inventory sync

### Planned 📋
- User authentication (Supabase)
- Wishlist functionality
- Price alerts
- Decklist import
- Shopping cart (multi-item)
- Order history

## Contributing

This is a private project. For questions or issues, contact the admin.

## License

Proprietary - All rights reserved

---

**Built with ❤️ for the Riftbound TCG community**
