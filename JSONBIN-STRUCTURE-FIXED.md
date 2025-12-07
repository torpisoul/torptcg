# JSONBin Structure - FIXED!

## Problem
`MASTER_INVENTORY_BIN_ID` and `PRODUCTS_BIN_ID` were pointing to the same bin, causing:
- Cards not showing on main products page
- Cards not showing in Card Inventory Management
- Only the 3D print showing (because it overwrote the card data)

## Solution Applied

Updated your `.env` file to use **separate bins**:

```env
# Card inventory (singles with stock levels)
MASTER_INVENTORY_BIN_ID=692ec5feae596e708f7e5206

# Sealed products, accessories, 3D prints
PRODUCTS_BIN_ID=692ed2dbae596e708f7e68f9
```

## Bin Structure Explained

### 1. MASTER_INVENTORY_BIN_ID (`692ec5feae596e708f7e5206`)
**Purpose**: Card inventory with stock levels
**Used by**: 
- Main products page (for singles)
- Card Inventory Management page
- Inventory function

**Contains**: Array of cards with stock info
```json
[
  {
    "id": "card-id",
    "name": "Card Name",
    "stock": 5,
    "price": 2.50,
    ...
  }
]
```

### 2. PRODUCTS_BIN_ID (`692ed2dbae596e708f7e68f9`)
**Purpose**: Non-card products
**Used by**:
- Main products page (for sealed/accessories/3D prints)
- Product Management page (`/admin/products.html`)
- Products function

**Contains**: Array of products
```json
[
  {
    "id": "product-id",
    "title": "Product Name",
    "category": "sealed" | "accessories",
    "price": 99.99,
    "stock": 5,
    "madeToOrder": false,
    ...
  }
]
```

### 3. CARD_INVENTORY_BIN_ID (`692e1a8443b1c97be9d1746c`)
**Purpose**: Alternative card inventory bin
**Note**: You have this but may not be using it currently

## What Shows Where

### Main Products Page (`/index.html`)
- **Singles**: From `MASTER_INVENTORY_BIN_ID`
- **Sealed**: From `PRODUCTS_BIN_ID`
- **Accessories**: From `PRODUCTS_BIN_ID`
- **3D Prints**: From `PRODUCTS_BIN_ID`

### Admin Pages
- **Card Inventory** (`/admin/card-inventory.html`): Uses `MASTER_INVENTORY_BIN_ID`
- **Product Management** (`/admin/products.html`): Uses `PRODUCTS_BIN_ID`

## Next Steps

1. **Restart netlify dev** (REQUIRED for changes to take effect)
   ```bash
   # Stop current server (Ctrl+C)
   netlify dev
   ```

2. **Verify on main products page**:
   - Visit: `http://localhost:8888/`
   - Check "Singles" filter - should show cards
   - Check "Sealed" filter - should show sealed products
   - Check "Accessories" filter - should show your 3D print

3. **Verify admin pages**:
   - Card Inventory: `http://localhost:8888/admin/card-inventory.html`
   - Product Management: `http://localhost:8888/admin/products.html`

## Summary

✅ **MASTER_INVENTORY_BIN_ID** = Cards (singles)
✅ **PRODUCTS_BIN_ID** = Everything else (sealed, accessories, 3D prints)

These must be **different bins** or you'll overwrite one with the other!

---

**Status**: ✅ FIXED
**Action Required**: Restart `netlify dev`
