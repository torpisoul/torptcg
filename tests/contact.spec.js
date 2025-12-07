const { test, expect } = require('@playwright/test');

test('Contact form submission sends correct data', async ({ page }) => {
  // Navigate to the contact section
  await page.goto('/index.html#contact');
  // Wait for the form to be visible
  await page.waitForSelector('form[name="contact"]');

  // Fill in the form fields
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.selectOption('select[name="enquiry-type"]', 'stock');
  await page.fill('textarea[name="message"]', 'This is a test message.');

  // Intercept the form submission request
  const requestPromise = page.waitForRequest(request =>
    request.method() === 'POST' &&
    request.url().includes('/index.html') // Netlify forms often post to the current page or action
    || request.url().includes('success.html')
  );

  // Click the submit button
  await page.click('button[type="submit"]');

  // Await the request and verify payload
  const request = await requestPromise;
  const formData = request.postData();

  // Since postData() might be URL-encoded, we should check for the presence of our data
  // Decode if necessary, but checking inclusion is usually safe for basic validation
  console.log('Form data:', formData);

  expect(formData).toContain('form-name=contact');
  expect(formData).toContain('name=Test+User');
  expect(formData).toContain('email=test%40example.com');
  expect(formData).toContain('enquiry-type=stock');
  expect(formData).toContain('message=This+is+a+test+message.');
});
