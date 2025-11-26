# 🔍 Netlify Setup Checklist for TorpTCG Admin

Use this checklist to ensure everything is properly configured in your Netlify dashboard.

---

## ✅ Pre-Deployment Checklist

### 1. GitHub Repository
- [ ] Code is pushed to GitHub
- [ ] Repository is connected to Netlify
- [ ] Correct branch is selected for deployment (usually `main`)

### 2. Local Files Verified
- [ ] `/admin/config.yml` exists
- [ ] `/admin/index.html` exists
- [ ] `/admin.html` exists
- [ ] `/products/` folder exists with at least one `.md` file
- [ ] `build-products.js` exists
- [ ] `package.json` has build script

---

## 🚀 Netlify Dashboard Configuration

### Step 1: Build Settings
Go to: **Site Settings → Build & Deploy → Build settings**

- [ ] Build command: `npm run build`
- [ ] Publish directory: `.` (current directory)
- [ ] Base directory: (leave empty or set to `torptcg` if needed)

### Step 2: Enable Netlify Identity
Go to: **Site Settings → Identity**

1. [ ] Click **"Enable Identity"** button
2. [ ] Wait for confirmation message

### Step 3: Configure Identity Settings
Go to: **Site Settings → Identity → Settings and usage**

**Registration preferences:**
- [ ] Set to **"Invite only"** (recommended for admin-only access)
  - This prevents random people from signing up
  - You control who gets access

**External providers (optional):**
- [ ] You can enable Google, GitHub, etc. for easier login
- [ ] Or keep it as email-only (default)

**Email templates:**
- [ ] Customize if desired (optional)
- [ ] Default templates work fine

### Step 4: Enable Git Gateway
Go to: **Site Settings → Identity → Services**

1. [ ] Find **"Git Gateway"** section
2. [ ] Click **"Enable Git Gateway"**
3. [ ] Confirm it shows as "Enabled"

**What Git Gateway does:**
- Allows Netlify CMS to commit changes to your GitHub repo
- Uses Netlify Identity for authentication
- No need to expose GitHub tokens

### Step 5: Invite Admin Users
Go to: **Site Settings → Identity → Invite users**

1. [ ] Click **"Invite users"**
2. [ ] Enter email address(es) of admin users
3. [ ] Click **"Send"**
4. [ ] Users will receive an email invitation

**Important:**
- Users must click the link in the email to set their password
- The invitation link expires after 24 hours
- You can resend invitations if needed

---

## 🧪 Testing Checklist

### Test 1: Unauthenticated Access (Incognito Mode)
1. [ ] Open site in incognito/private window
2. [ ] Navigate to `https://torptcg.app/admin/`
3. [ ] Should see "Verifying authentication..." spinner
4. [ ] Should redirect to `/admin.html` (login page)
5. [ ] Should NOT see the CMS interface

**If this fails:**
- Check browser console (F12) for errors
- Verify Netlify Identity script is loading
- Check that `/admin/index.html` has the authentication code

### Test 2: Login Flow
1. [ ] At `/admin.html`, click **"Login"** button
2. [ ] Netlify Identity modal should appear
3. [ ] Enter your credentials
4. [ ] Should redirect to `/admin/` after successful login
5. [ ] Should see "Verifying authentication..." then CMS loads

**If this fails:**
- Verify you've been invited as a user (check email)
- Check that Netlify Identity is enabled
- Clear browser cache and try again

### Test 3: CMS Functionality
1. [ ] CMS interface loads successfully
2. [ ] Click **"New Products"** in the CMS
3. [ ] Fill in product details
4. [ ] Click **"Publish"**
5. [ ] Should see success message
6. [ ] Check GitHub repo - new `.md` file should appear in `/products/`

**If this fails:**
- Check that Git Gateway is enabled
- Verify branch name in `config.yml` matches your repo
- Check Netlify build logs for errors

### Test 4: Product Display on Site
1. [ ] Wait for Netlify to rebuild (usually 1-2 minutes)
2. [ ] Go to main site: `https://torptcg.app/`
3. [ ] Scroll to products section
4. [ ] New product should appear

**If this fails:**
- Check Netlify build logs
- Verify `npm run build` ran successfully
- Check that `products-data.json` was generated
- Verify `script.js` is loading products correctly

### Test 5: Logout
1. [ ] In CMS, click your user icon (top right)
2. [ ] Click **"Log out"**
3. [ ] Should redirect to `/admin.html`
4. [ ] Try accessing `/admin/` again - should redirect to login

---

## 🔧 Common Issues & Quick Fixes

### Issue: "Enable Identity" button not showing
- **Fix**: Refresh the Netlify dashboard page
- **Or**: Try a different browser

### Issue: Git Gateway option not available
- **Fix**: Ensure Identity is enabled first
- **Then**: Refresh the page and check Services tab again

### Issue: Invitation emails not arriving
- **Fix**: Check spam folder
- **Or**: Resend invitation from Netlify dashboard
- **Or**: Check email address is correct

### Issue: CMS shows "Config Errors"
- **Fix**: Check browser console for specific error
- **Common causes**:
  - `config.yml` has syntax errors
  - Branch name mismatch (main vs master)
  - Git Gateway not enabled

### Issue: Can't save products in CMS
- **Fix**: 
  1. Verify Git Gateway is enabled
  2. Check that you're logged in as an invited user
  3. Ensure GitHub repo is connected to Netlify
  4. Check Netlify build logs for errors

---

## 📊 Verification Summary

Once you've completed all steps, you should have:

✅ Netlify Identity enabled  
✅ Git Gateway enabled  
✅ At least one admin user invited  
✅ Build settings configured  
✅ `/admin.html` redirects unauthenticated users  
✅ `/admin/` only loads for authenticated users  
✅ CMS can create/edit/delete products  
✅ Products appear on the main site  

---

## 🆘 Still Having Issues?

### Check These:

1. **Browser Console (F12)**
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Netlify Build Logs**
   - Site Settings → Build & Deploy → Deploy log
   - Look for build errors or warnings

3. **Netlify Identity Logs**
   - Site Settings → Identity → Usage
   - Check for authentication errors

4. **GitHub Repository**
   - Verify new product `.md` files are being committed
   - Check that commits are triggering Netlify builds

### Debug Mode

Add this to your browser console while on `/admin/`:
```javascript
// Check if Netlify Identity is loaded
console.log('Netlify Identity:', window.netlifyIdentity);

// Check current user
if (window.netlifyIdentity) {
  netlifyIdentity.on('init', user => {
    console.log('Current user:', user);
  });
}
```

---

## 📞 Next Steps After Setup

1. **Add more products** through the CMS
2. **Customize email templates** (optional)
3. **Set up custom domain** (if not already done)
4. **Enable form notifications** (for contact form)
5. **Set up analytics** (optional)

---

**Last Updated:** 2025-11-26  
**Version:** 2.0 (Fixed authentication bypass issue)
