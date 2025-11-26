# Migration from Netlify Identity to GitHub OAuth

## Overview

This document outlines the migration from the deprecated Netlify Identity service to GitHub OAuth for authenticating admin users to the Netlify CMS.

## What Changed

### Before (Netlify Identity)
- Used `git-gateway` backend with Netlify Identity
- Required Netlify Identity widget in HTML
- Users logged in with email/password managed by Netlify

### After (GitHub OAuth)
- Uses `github` backend with GitHub OAuth
- No additional widgets needed
- Users log in with their GitHub accounts
- Simpler, more secure, and not deprecated

## Files Modified

### 1. `admin/config.yml`
**Changed backend from:**
```yaml
backend:
  name: git-gateway
  branch: main
```

**To:**
```yaml
backend:
  name: github
  repo: torpisoul/colourcraft
  branch: main
```

### 2. `index.html`
- Removed Netlify Identity widget script tag
- Removed Netlify Identity redirect handling JavaScript

### 3. `admin.html`
- Removed Netlify Identity widget
- Simplified to a clean landing page
- Removed authentication checks (GitHub OAuth handles this)

### 4. `admin/index.html`
- Removed all Netlify Identity authentication logic
- Simplified to just load Netlify CMS
- GitHub OAuth handles authentication automatically

## How It Works Now

1. **User visits `/admin/`**
   - Netlify CMS loads
   - Detects GitHub backend configuration

2. **Authentication Flow**
   - User clicks "Login with GitHub"
   - Redirected to GitHub OAuth authorization
   - Grants access to the repository
   - Redirected back to CMS

3. **Product Management**
   - User can add/edit/delete products
   - Changes are committed directly to the GitHub repository
   - Build process automatically regenerates `products-data.json`

## Required GitHub Repository Settings

### Important: Update the Repository Name

In `admin/config.yml`, make sure the `repo` field matches your actual GitHub repository:

```yaml
backend:
  name: github
  repo: YOUR_GITHUB_USERNAME/YOUR_REPO_NAME  # Update this!
  branch: main
```

### Repository Permissions

Users who need admin access must have:
- **Write access** to the GitHub repository
- This is managed through GitHub repository settings (Settings → Collaborators)

## Deployment on Netlify

### Build Settings

The `netlify.toml` file already has the correct configuration:

```toml
[build]
  command = "npm run build"
  publish = "."
```

This ensures that when products are added/edited via the CMS:
1. Changes are pushed to GitHub
2. Netlify detects the change
3. Runs `npm run build` to regenerate `products-data.json`
4. Deploys the updated site

### No Additional Netlify Configuration Needed

Unlike Netlify Identity, GitHub OAuth doesn't require:
- ❌ Enabling Netlify Identity in site settings
- ❌ Configuring Git Gateway
- ❌ Managing users in Netlify dashboard
- ✅ Just works with GitHub repository permissions!

## Testing the Migration

### Local Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:8080`
   - Homepage should load normally
   - Products should display correctly
   - Filters should work

3. Visit `http://localhost:8080/admin/`
   - **Note:** GitHub OAuth won't work locally
   - You'll see an error about OAuth configuration
   - This is expected and normal

### Production Testing (After Deployment)

1. Deploy to Netlify
2. Visit `https://your-site.netlify.app/admin/`
3. Click "Login with GitHub"
4. Authorize the application
5. You should see the Netlify CMS interface

## Adding/Removing Admin Users

### To Grant Admin Access:
1. Go to your GitHub repository
2. Click "Settings" → "Collaborators"
3. Add the user's GitHub username
4. They can now log in to `/admin/`

### To Revoke Admin Access:
1. Go to repository settings
2. Remove the user from collaborators
3. They will no longer be able to access the CMS

## Advantages of GitHub OAuth

1. **Not Deprecated** - GitHub OAuth is actively maintained
2. **Simpler** - No additional services to configure
3. **More Secure** - Leverages GitHub's robust authentication
4. **Better Integration** - Direct connection to your Git repository
5. **Free** - No additional costs
6. **Familiar** - Most developers already have GitHub accounts

## Troubleshooting

### "Error: Failed to load config.yml"
- Check that `admin/config.yml` has the correct repository name
- Ensure the file is properly formatted YAML

### "Login with GitHub" button doesn't appear
- Check browser console for errors
- Ensure Netlify CMS script is loading correctly
- Verify `admin/index.html` is accessible

### "Authentication Failed"
- Ensure you have write access to the GitHub repository
- Check that the repository name in `config.yml` is correct
- Try logging out of GitHub and back in

### Products not updating on the homepage
- Check that `npm run build` runs successfully
- Verify `products-data.json` is being generated
- Ensure the build command is configured in `netlify.toml`

## Next Steps

1. ✅ Update `admin/config.yml` with your correct GitHub repository name
2. ✅ Commit and push all changes to GitHub
3. ✅ Deploy to Netlify
4. ✅ Test the admin panel at `/admin/`
5. ✅ Add collaborators who need admin access

## Support

If you encounter issues:
1. Check the Netlify CMS documentation: https://decapcms.org/
2. Review GitHub OAuth setup: https://docs.github.com/en/developers/apps/building-oauth-apps
3. Check Netlify build logs for errors
