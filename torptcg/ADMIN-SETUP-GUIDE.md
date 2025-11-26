# 🔐 TorpTCG Admin & Product Management Guide

## Overview

Your TorpTCG site now uses **Netlify CMS** for product management, secured behind **Netlify Identity** authentication. This guide explains how everything works and how to use it.

---

## 🎯 What Changed

### Before
- Manual product entry form at `/admin.html`
- No authentication protection
- Products stored in `products-data.json` manually

### After
- **Authentication Gateway** at `/admin.html` - checks login status
- **Netlify CMS** at `/admin/` - full product management interface
- **Protected Access** - only logged-in users can access the CMS
- **Markdown-based Products** - products stored as `.md` files in `/products/`
- **Automatic Build** - products compile to JSON on deployment

---

## 🚀 How to Access Admin Panel

### Step 1: Navigate to Admin
Go to: `https://torptcg.app/admin.html`

### Step 2: Login
- If you're not logged in, you'll see a login prompt
- Click the **Login** button
- Use your Netlify Identity credentials

### Step 3: Manage Products
- After login, you'll be automatically redirected to `/admin/`
- This is the Netlify CMS interface where you can:
  - ✅ Add new products
  - ✏️ Edit existing products
  - 🗑️ Delete products
  - 📸 Upload product images
  - 👁️ Preview changes before publishing

---

## 📦 Product Management Workflow

### Adding a New Product

1. **Login** to `/admin.html`
2. In the CMS, click **"New Products"**
3. Fill in the product details:
   - **Title**: Product name (e.g., "Riftbound: Origins Booster Box")
   - **Category**: Select from dropdown (singles, sealed, accessories, prints)
   - **Price**: Include currency symbol (e.g., "£45.00")
   - **Image**: Upload an image or provide a URL
   - **Stock Status**: In Stock, Low Stock, Out of Stock, or Made to Order
   - **Description**: Optional product description
   - **Featured**: Toggle if this should be a featured product

4. Click **"Publish"**
5. The product is saved as a markdown file in `/products/`
6. Netlify automatically rebuilds the site and updates the product catalog

### Editing a Product

1. Login to the CMS
2. Click on the product you want to edit
3. Make your changes
4. Click **"Publish"** to save

### Deleting a Product

1. Login to the CMS
2. Click on the product
3. Click **"Delete"** (usually in the top menu)
4. Confirm deletion

---

## 🔧 Technical Details

### File Structure

```
torptcg/
├── admin/
│   ├── index.html          # Netlify CMS interface (protected)
│   └── config.yml          # CMS configuration
├── admin.html              # Authentication gateway
├── products/               # Product markdown files
│   └── *.md               # Each product is a separate .md file
├── products-data.json      # Generated JSON (auto-created on build)
├── build-products.js       # Script to convert .md → JSON
└── script.js              # Frontend script that loads products
```

### How Products are Stored

Each product is a markdown file with YAML frontmatter:

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

### Build Process

1. **Edit in CMS** → Saves to `/products/*.md`
2. **Netlify Build** → Runs `npm run build`
3. **Build Script** → Reads all `.md` files, converts to JSON
4. **Output** → Creates `products-data.json`
5. **Frontend** → Loads products from JSON file

---

## 🔐 Authentication & Security

### How Authentication Works

1. **Netlify Identity** is enabled on your site
2. `/admin.html` checks if user is logged in
3. If **not logged in** → Shows login prompt
4. If **logged in** → Redirects to `/admin/` (CMS)
5. `/admin/index.html` also checks authentication
6. If user tries to access `/admin/` directly without login → Redirected to `/admin.html`

### Managing Users

To add/remove admin users:

1. Go to your **Netlify Dashboard**
2. Select your site → **Identity** tab
3. Click **"Invite users"**
4. Send invitation emails
5. Users will receive an email to set up their account

---

## 🛠️ Local Development

### Testing Locally

```bash
# Navigate to project directory
cd torptcg

# Build products JSON
npm run build

# Serve the site locally (use any local server)
# For example, with Python:
python -m http.server 8000

# Or with Node.js http-server:
npx http-server -p 8000
```

**Note**: Netlify Identity won't work locally. You'll need to deploy to Netlify to test authentication.

### Testing on Netlify

1. Push changes to GitHub
2. Netlify auto-deploys
3. Visit your live site
4. Test the admin panel at `/admin.html`

---

## 📝 Configuration Files

### `/admin/config.yml` - CMS Configuration

This file defines:
- Backend (Git Gateway)
- Media folder for uploads
- Product fields and their types
- Validation rules

### `/netlify.toml` - Build Configuration

```toml
[build]
  command = "npm run build"
  publish = "."

# Don't redirect /admin to index.html
[[redirects]]
  from = "/admin/*"
  to = "/admin/:splat"
  status = 200

# Redirect everything else to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
```

---

## 🐛 Troubleshooting

### "Authentication system not available"
- **Cause**: Netlify Identity widget didn't load
- **Fix**: Check your internet connection, ensure Netlify Identity is enabled in dashboard

### Admin page accessible without login / CMS unresponsive
- **Cause**: CMS was loading before authentication check completed (race condition)
- **Fix**: ✅ **FIXED** - The CMS now only loads after authentication is verified
- **How it works now**:
  1. You see a "Verifying authentication..." spinner
  2. System checks if you're logged in
  3. If not logged in → Redirected to `/admin.html`
  4. If logged in → CMS loads dynamically
  
**To verify the fix:**
1. Open `/admin/` in an incognito/private window (not logged in)
2. You should see the spinner briefly, then be redirected to `/admin.html`
3. Login at `/admin.html`
4. You should be redirected to `/admin/` and see the CMS load

### CMS shows "Error: Failed to load config.yml"
- **Cause**: Config file not found or Git Gateway not enabled
- **Fix**:
  1. Verify `/admin/config.yml` exists
  2. In Netlify Dashboard → Identity → Services → Enable Git Gateway
  3. Ensure your GitHub repo is connected to Netlify

### "Config Errors: Error: Failed to persist entry"
- **Cause**: Git Gateway not properly configured or no write permissions
- **Fix**:
  1. Netlify Dashboard → Identity → Services → Git Gateway → Enable
  2. Ensure the authenticated user has write access to the repo
  3. Check that the branch name in `config.yml` matches your repo (main vs master)

### Products not showing on site
- **Cause**: Build didn't run or JSON file not generated
- **Fix**: 
  1. Check Netlify build logs
  2. Ensure `npm run build` runs successfully
  3. Verify `products-data.json` exists

### Can't access CMS after login
- **Cause**: Redirect loop or authentication issue
- **Fix**:
  1. Clear browser cache
  2. Log out and log back in
  3. Check browser console for errors (F12)
  4. Verify Netlify Identity is enabled in dashboard

### Images not uploading
- **Cause**: Media folder not configured correctly
- **Fix**: Check `/admin/config.yml` media_folder settings

### "Authentication check timed out"
- **Cause**: Netlify Identity taking too long to initialize
- **Fix**:
  1. Check your internet connection
  2. Refresh the page
  3. If persists, check Netlify status page
  4. Verify Netlify Identity is enabled in your site settings

---

## ✅ Quick Reference

| Action | URL |
|--------|-----|
| Login to Admin | `/admin.html` |
| Manage Products | `/admin/` (after login) |
| View Shop | `/` or `/index.html` |
| Back to Shop | Link in admin pages |

---

## 🎉 Summary

You now have a fully functional, secure product management system:

✅ **Netlify CMS** for easy product management  
✅ **Netlify Identity** for authentication  
✅ **Markdown-based** products (version control friendly)  
✅ **Automatic builds** on every change  
✅ **Protected admin area** - only authorized users can access  

**Next Steps:**
1. Deploy to Netlify
2. Enable Netlify Identity in dashboard
3. Invite admin users
4. Start adding products!

---

*For more help, see the [Netlify CMS Documentation](https://www.netlifycms.org/docs/) or [Netlify Identity Documentation](https://docs.netlify.com/visitor-access/identity/).*
