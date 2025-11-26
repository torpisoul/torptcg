# TorpTCG Quick Start Guide

## 🚀 Getting Started

This guide will help you manage your TorpTCG website and products.

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Products Data
```bash
npm run build
```

This command reads all markdown files in the `products/` folder and generates `products-data.json`.

### 3. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:8080` to view your site.

### 4. Watch for Product Changes (Optional)
```bash
npm run watch
```

This automatically rebuilds `products-data.json` whenever you edit product markdown files.

## Managing Products

### Via Netlify CMS (Recommended)

1. **Access the Admin Panel**
   - Visit `https://your-site.netlify.app/admin/`
   - Click "Login with GitHub"
   - Authorize the application

2. **Add a New Product**
   - Click "New Products"
   - Fill in the form:
     - **Title**: Product name
     - **Category**: singles, sealed, accessories, or prints
     - **Price**: Include currency symbol (e.g., £45.00)
     - **Image**: Upload or provide URL
     - **Stock Status**: In Stock, Low Stock, Out of Stock, or Made to Order
     - **Description**: Optional product description
     - **Featured**: Check to feature on homepage
   - Click "Publish"

3. **Edit a Product**
   - Click on the product in the list
   - Make your changes
   - Click "Publish"

4. **Delete a Product**
   - Click on the product
   - Click "Delete entry"
   - Confirm deletion

### Via Markdown Files (Advanced)

Products are stored as markdown files in the `products/` folder.

**Example: `products/my-product.md`**
```markdown
---
title: "Riftbound: Origins Booster Box"
category: "sealed"
price: "£120.00"
image: "https://example.com/image.jpg"
stock: "In Stock"
description: "24 booster packs of the highly sought-after Origins set"
featured: true
---
```

After editing, run `npm run build` to regenerate the JSON file.

## Categories

Your site supports four product categories:

- **singles**: Individual trading cards
- **sealed**: Booster boxes, starter decks, etc.
- **accessories**: Plushies, playmats, etc.
- **prints**: 3D printed items (deck boxes, miniatures, etc.)

## Stock Status Options

- **In Stock**: Product is available
- **Low Stock**: Limited quantity remaining
- **Out of Stock**: Currently unavailable
- **Made to Order**: Custom/bespoke items

## Homepage Filters

The homepage has filter buttons that automatically work with your product categories:
- **All**: Shows all products
- **Singles**: Shows only single cards
- **Sealed**: Shows only sealed products
- **Accessories**: Shows only accessories
- **3D Prints**: Shows only 3D printed items

## Deployment

### Deploying to Netlify

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Update products"
   git push
   ```

2. **Automatic Deployment**
   - Netlify detects the push
   - Runs `npm run build`
   - Deploys your site
   - Products automatically update!

### Build Process

When Netlify builds your site:
1. Runs `npm run build`
2. Reads all `.md` files in `products/`
3. Generates `products-data.json`
4. Homepage loads products from this JSON file

## Admin Access

### Who Can Access the Admin Panel?

Anyone with **write access** to your GitHub repository can log in to `/admin/`.

### Adding Admin Users

1. Go to your GitHub repository
2. Click "Settings" → "Collaborators"
3. Click "Add people"
4. Enter their GitHub username
5. They can now access `/admin/`

### Removing Admin Users

1. Go to repository settings → Collaborators
2. Click "Remove" next to their name

## File Structure

```
torptcg/
├── admin/
│   ├── config.yml          # Netlify CMS configuration
│   └── index.html          # CMS admin interface
├── products/               # Product markdown files
│   ├── product-1.md
│   ├── product-2.md
│   └── ...
├── images/
│   └── uploads/           # Uploaded product images
├── index.html             # Homepage
├── admin.html             # Admin landing page
├── script.js              # Frontend JavaScript
├── styles.css             # Styles
├── build-products.js      # Build script
├── watch-products.js      # File watcher
├── products-data.json     # Generated product data
├── package.json           # Dependencies
└── netlify.toml           # Netlify configuration
```

## Troubleshooting

### Products not showing on homepage?
1. Check `products-data.json` exists
2. Run `npm run build`
3. Check browser console for errors

### Can't log in to admin panel?
1. Ensure you have write access to the GitHub repository
2. Check that `admin/config.yml` has the correct repo name
3. Try clearing browser cache

### Images not loading?
1. Check image URLs are correct
2. For uploaded images, ensure they're in `images/uploads/`
3. Check browser console for 404 errors

### Filters not working?
1. Ensure product categories match exactly: singles, sealed, accessories, prints
2. Check browser console for JavaScript errors
3. Clear browser cache and reload

## Important Notes

⚠️ **Before deploying to production:**
1. Update `admin/config.yml` with your correct GitHub repository name
2. Test the admin panel on Netlify (it won't work locally)
3. Ensure at least one product exists for testing

✅ **Best Practices:**
- Always use the correct category names (lowercase)
- Include currency symbols in prices (£, $, €)
- Use high-quality product images (recommended: 400x400px minimum)
- Write clear, concise product descriptions
- Keep product titles under 50 characters for best display

## Need Help?

- **Netlify CMS Docs**: https://decapcms.org/
- **GitHub OAuth**: See `GITHUB-OAUTH-MIGRATION.md`
- **Build Issues**: Check Netlify build logs in your dashboard
