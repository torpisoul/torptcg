# Fix: Create Products Bin in JSONBin

## Problem
The PRODUCTS_BIN_ID in your .env doesn't belong to your account, causing a 401 error when trying to save products.

## Solution: Create a New Bin

### Option 1: Via JSONBin Website (Recommended - 2 minutes)

1. **Go to JSONBin.io**
   - Visit: https://jsonbin.io/
   - Log in to your account

2. **Create New Bin**
   - Click "Create Bin" or "New Bin"
   - Name it: `torptcg-products`
   - Paste this initial data:
   ```json
   [
     {
       "id": "sample-product",
       "title": "Sample Product (Delete Me)",
       "category": "accessories",
       "price": 0.01,
       "stock": 0,
       "madeToOrder": false,
       "image": "https://via.placeholder.com/300",
       "description": "Sample product - delete after adding your first real product"
     }
   ]
   ```
   - Click "Create"

3. **Copy the Bin ID**
   - After creating, you'll see the bin ID in the URL or bin details
   - It looks like: `675xxxxxxxxxxxxxxxxx`
   - Copy this ID

4. **Update Your .env File**
   - Open your `.env` file
   - Find the line: `PRODUCTS_BIN_ID=6930a9c3d0ea881f4010f6d3`
   - Replace with: `PRODUCTS_BIN_ID=YOUR_NEW_BIN_ID`
   - Save the file

5. **Restart Netlify Dev**
   - Stop the current server (Ctrl+C)
   - Start it again: `netlify dev`

6. **Test**
   - Refresh the products page
   - You should see the sample product
   - Try adding a new product
   - Delete the sample product

---

### Option 2: Check Your API Key

If you want to use the script, first verify your API key:

1. **Get Your API Key**
   - Go to: https://jsonbin.io/
   - Log in
   - Go to "API Keys" section
   - Copy your Master Key

2. **Update .env**
   - Open `.env` file
   - Update: `JSONBIN_API_KEY=your_actual_master_key_here`
   - Save

3. **Run Script**
   ```bash
   node create-products-bin.js
   ```

4. **Copy the New Bin ID**
   - The script will output a new bin ID
   - Update `PRODUCTS_BIN_ID` in your `.env` file

5. **Restart Netlify Dev**

---

## Quick Fix Summary

**Fastest Solution**:
1. Go to JSONBin.io
2. Create new bin named "torptcg-products"
3. Paste the sample JSON above
4. Copy the bin ID
5. Update `PRODUCTS_BIN_ID` in `.env`
6. Restart `netlify dev`
7. Done! ✅

---

## Why This Happened

The bin ID `6930a9c3d0ea881f4010f6d3` was either:
- Created in a different JSONBin account
- A placeholder/example ID
- From a previous setup

You need a bin that belongs to YOUR JSONBin account.

---

## After Creating the Bin

Once you have the new bin ID and have updated your `.env`:

1. **Restart netlify dev**
2. **Refresh products page**
3. **You should see the sample product**
4. **Add your first real product**
5. **Delete the sample product**

---

**Next Step**: Create the bin on JSONBin.io (takes 2 minutes!)
