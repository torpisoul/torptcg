# URGENT FIX: Environment Variables Not Loading

## Problem
The error "X-Master-Key is invalid" means your environment variables aren't being loaded by Netlify Dev.

## Quick Fix

### Option 1: Restart Netlify Dev (Recommended)

1. **Stop** the current `netlify dev` server (Ctrl+C)
2. **Restart** it:
   ```bash
   netlify dev
   ```

Netlify Dev should automatically load your `.env` file on startup.

### Option 2: Check Your .env File

Make sure you have a `.env` file in your project root with:

```env
JSONBIN_API_KEY=your_actual_api_key_here
PRODUCTS_BIN_ID=6930a9c3d0ea881f4010f6d3
MASTER_INVENTORY_BIN_ID=your_master_bin_id_here

# Card bins
CALM_BIN_ID=your_calm_bin_id
FURY_BIN_ID=your_fury_bin_id
ORDER_BIN_ID=your_order_bin_id
CHAOS_BIN_ID=your_chaos_bin_id
MIND_BIN_ID=your_mind_bin_id
BODY_BIN_ID=your_body_bin_id
DUAL_BIN_ID=your_dual_bin_id
```

### Option 3: Hardcode Temporarily (For Testing Only)

**TEMPORARY FIX** - Update `netlify/functions/config.js`:

```javascript
module.exports = {
    JSONBIN_API_KEY: process.env.JSONBIN_API_KEY || 'YOUR_ACTUAL_API_KEY_HERE',
    PRODUCTS_BIN_ID: process.env.PRODUCTS_BIN_ID || '6930a9c3d0ea881f4010f6d3',
    MASTER_INVENTORY_BIN_ID: process.env.MASTER_INVENTORY_BIN_ID || 'YOUR_MASTER_BIN_ID',
    // ... rest of config
};
```

**⚠️ WARNING**: Remove hardcoded keys before committing to Git!

---

## Verification

After restarting, test if env vars are loaded:

1. Visit: `http://localhost:8888/.netlify/functions/products`
2. Should return product list (not 401 error)

---

## Most Likely Solution

**Just restart `netlify dev`** - it should pick up your `.env` file automatically.

---

## If Still Not Working

Check these:

1. **.env file location**: Must be in project root (same folder as `netlify.toml`)
2. **.env file format**: No quotes around values, no spaces around `=`
3. **Netlify CLI version**: Run `netlify --version` (should be 17.0.0+)

---

## Quick Test

Run this in your terminal:

```powershell
# Check if .env file exists
Test-Path .env

# Check if it has JSONBIN_API_KEY
Get-Content .env | Select-String "JSONBIN_API_KEY"
```

If `.env` doesn't exist or is empty, you need to create it with your actual API keys.

---

**Next Step**: Restart `netlify dev` and try adding a product again.
