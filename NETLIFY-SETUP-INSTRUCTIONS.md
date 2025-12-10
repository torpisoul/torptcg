# Netlify Environment Variables Setup

## Instructions:
1. Open your local `.env` file in this directory
2. Copy ALL the environment variables from it
3. Go to: https://app.netlify.com → Your Site → Site settings → Environment variables
4. Click "Add a variable" for each one
5. Make sure to set them for ALL scopes (Production, Deploy Previews, Branch deploys)

## Required Variables (copy values from your .env file):

- JSONBIN_API_KEY
- MASTER_INVENTORY_BIN_ID
- CARD_INVENTORY_BIN_ID
- PRODUCTS_BIN_ID
- CALM_BIN_ID
- FURY_BIN_ID
- ORDER_BIN_ID
- CHAOS_BIN_ID
- MIND_BIN_ID
- BODY_BIN_ID
- DUAL_BIN_ID
- JSONBIN_INVENTORY_BIN (if present)

## After Adding Variables:
1. Go to Deploys tab
2. Click "Trigger deploy" → "Clear cache and deploy site"
3. Wait for deployment to complete
4. Test your site - the 502 error should be gone!

## Note:
The 502 error happens because the Netlify Functions can't find these environment variables.
Once you add them, the functions will work correctly.
