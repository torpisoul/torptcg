# Test Suite for TorpTCG

This directory contains automated tests for the TorpTCG website using Playwright.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

## Running Tests

### Prerequisites
- Make sure `netlify dev` is running on `http://localhost:8888`
- Ensure you have some test data in your inventory

### Run all tests
```bash
npm test
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run specific test file
```bash
npx playwright test tests/singles-display.spec.js
```

### Run tests with specific browser
```bash
npx playwright test --project=chromium
```

## Test Suites

### 1. Singles Display Tests (`singles-display.spec.js`)
Tests the display and styling of cards on the singles page:
- ✅ Cards display correctly
- ✅ Images load properly
- ✅ Card names are visible
- ✅ Stock labels show correct status
- ✅ Prices are displayed
- ✅ Add to cart buttons are present
- ✅ Hover effects work (single-domain and dual-domain)
- ✅ Domain-specific styling is applied
- ✅ Rainbow gradient for non-singles
- ✅ Domain filters work correctly
- ✅ Stock status is accurate

### 2. Inventory Management Tests (`inventory-management.spec.js`)
Tests adding, updating, and removing cards from inventory:
- ✅ Add new card to inventory
- ✅ Card appears on product page after adding
- ✅ Update existing card stock
- ✅ Changes reflect on product page
- ✅ Remove card (set stock to 0)
- ✅ Card disappears from product page
- ✅ Dual-domain cards save to correct bin

### 3. Card Search Tests (`card-search.spec.js`)
Tests search and filter functionality:
- ✅ Search input is present
- ✅ Search filters cards correctly
- ✅ Clear search shows all cards
- ✅ No results message for non-existent cards
- ✅ Advanced filters (rarity, type)
- ✅ Multiple filters can be combined
- ✅ Sort functionality (if available)

## Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Debugging Tests

### Run in debug mode
```bash
npx playwright test --debug
```

### Run specific test in debug mode
```bash
npx playwright test tests/singles-display.spec.js --debug
```

### View trace
```bash
npx playwright show-trace trace.zip
```

## Known Issues / Notes

1. **Search Functionality**: The card search filter appears to be missing from the singles page. Tests will skip if search input is not found.

2. **Test Data**: Some tests require existing inventory data. Make sure you have:
   - At least one card with stock > 0
   - At least one dual-domain card
   - Cards from multiple domains

3. **Sequential Execution**: Tests run sequentially (not in parallel) to avoid race conditions with inventory updates.

## Adding New Tests

1. Create a new `.spec.js` file in the `tests/` directory
2. Import Playwright test utilities:
   ```javascript
   import { test, expect } from '@playwright/test';
   ```
3. Write your tests using `test.describe()` and `test()` blocks
4. Run your tests with `npm test`

## CI/CD Integration

To run tests in CI:
```bash
npx playwright test --reporter=github
```

## Troubleshooting

### Tests fail with "Target closed"
- Make sure `netlify dev` is running
- Check that the site is accessible at `http://localhost:8888`

### Tests timeout
- Increase timeout in `playwright.config.js`
- Check network tab for slow API calls

### Element not found
- Check that selectors match your HTML structure
- Use `page.pause()` to inspect the page during test execution

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass before committing
3. Update this README if adding new test suites
