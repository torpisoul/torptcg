<instruction>You are an expert software engineer. You are working on a WIP branch. Please run `git status` and `git diff` to understand the changes and the current state of the code. Analyze the workspace context and complete the mission brief.</instruction>
<workspace_context>
<artifacts>
--- CURRENT TASK CHECKLIST ---
# Checkout Fix and Test Creation

## Planning
- [x] Investigate existing tests
- [x] Identify root cause of 500 error
- [x] Create implementation plan
- [x] Get user approval

## Execution
- [x] Fix `create-checkout-session.js` - move Stripe require to top-level, lazy init inside handler
- [x] Create `checkout.spec.js` Playwright tests

## Verification
- [/] Restart `netlify dev` and test checkout manually
- [ ] Run checkout tests to confirm fix

--- IMPLEMENTATION PLAN ---
# Fix Checkout Session and Create Tests

## Problem Summary
The checkout function fails with a 500 error because:
1. **Module caching issue**: Stripe initialization happens at module load time, before environment variables are properly available
2. **Incorrect environment variable name**: Code was looking for `STRIPE_SECRET_KEY` but the env has `TEST_STRIPE_SECRET_KEY`

Additionally, no checkout-specific Playwright tests exist.

## Proposed Changes

### Netlify Functions

#### [MODIFY] [create-checkout-session.js](file:///c:/Users/torpi/Documents/GitHub/projects/netlify/functions/create-checkout-session.js)

**Fix the module caching issue** by moving Stripe initialization inside the handler function (lazy initialization). This ensures environment variables are available when Stripe is initialized:

```diff
- // Stripe initialization at module load time (problematic)
- let stripe;
- let stripeInitError = null;
- try {
-     const stripeKey = process.env.TEST_STRIPE_SECRET_KEY || ...
-     stripe = require('stripe')(stripeKey);
- } ...

+ // Lazy initialize Stripe inside handler
+ exports.handler = async function(event, context) {
+     const stripeKey = process.env.TEST_STRIPE_SECRET_KEY || 
+                       process.env.PROD_STRIPE_SECRET_KEY || 
+                       process.env.STRIPE_SECRET_KEY;
+     if (!stripeKey) {
+         return { statusCode: 500, body: JSON.stringify({ error: '...' }) };
+     }
+     const stripe = require('stripe')(stripeKey);
+     // ... rest of handler
+ }
```

---

### Tests

#### [NEW] [checkout.spec.js](file:///c:/Users/torpi/Documents/GitHub/projects/tests/checkout.spec.js)

Create a new Playwright test file with:
1. Test that clicking checkout opens Stripe (or returns success response)
2. Test error handling for empty cart
3. Test error handling for out-of-stock items

> [!IMPORTANT]
> The current Playwright config uses `http-server` on port 8080, which doesn't include Netlify functions. For checkout tests to work, we need to either:
> - **Option A**: Run tests against `netlify dev` (port 8888) - requires manual server start
> - **Option B**: Mock the checkout API response in tests

I recommend **Option A** for realistic testing.

---

## Verification Plan

### Automated Tests
```bash
# Start netlify dev in one terminal
netlify dev

# Run checkout tests in another terminal
npx playwright test tests/checkout.spec.js
```

### Manual Verification
1. Open http://localhost:8888
2. Add an item to basket
3. Click "Checkout" button
4. Confirm you're redirected to Stripe checkout page (or see no 500 error)
</artifacts>
</workspace_context>
<mission_brief>[Describe your task here...]</mission_brief>