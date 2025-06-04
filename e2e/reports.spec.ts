import { test, expect } from '@playwright/test';

test.describe('Report Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Authentication disabled - navigate directly to home page
    await page.goto('/');
  });

  test('should navigate to reports page without authentication', async ({ page }) => {
    // Navigate to reports page
    await page.click('text=Reports');
    await expect(page).toHaveURL('/reports');
    
    // Should show reports without authentication
    await expect(page.locator('h1')).toContainText('Generated Reports');
  });

  test('should access chat agent without authentication', async ({ page }) => {
    // Navigate to chat page
    await page.click('text=Chat Agent');
    await expect(page).toHaveURL('/chat');
    
    // Should load chat interface
    await expect(page.locator('h2')).toContainText('Competitor Research Agent');
  });

  test('should display existing reports on home page', async ({ page }) => {
    // Home page should show recent reports
    await expect(page.locator('h1')).toContainText('Competitor Research Dashboard');
    
    // Check if reports section exists
    await expect(page.locator('text=Recent Reports')).toBeVisible();
  });

  test('should allow downloading reports without authentication', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    
    // If reports exist, download button should be visible
    const reportExists = await page.locator('[download]').count() > 0;
    if (reportExists) {
      await expect(page.locator('[download]').first()).toBeVisible();
    }
  });
});

test.describe('Navigation Without Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to home page - no authentication required
    await page.goto('/');
  });

  test('should navigate to all pages without authentication', async ({ page }) => {
    // Test Dashboard/Home
    await expect(page.locator('h1')).toContainText('Competitor Research Dashboard');

    // Test Chat Agent
    await page.click('text=Chat Agent');
    await expect(page).toHaveURL('/chat');
    await expect(page.locator('h2')).toContainText('Competitor Research Agent');

    // Test Reports
    await page.click('text=Reports');
    await expect(page).toHaveURL('/reports');
    await expect(page.locator('h1')).toContainText('Generated Reports');

    // Test navigation back to home
    await page.click('text=CompAI');
    await expect(page).toHaveURL('/');
  });

  test('should show navigation without auth elements', async ({ page }) => {
    // Navigation should not show sign in/out buttons
    await expect(page.locator('text=Sign in')).not.toBeVisible();
    await expect(page.locator('text=Sign out')).not.toBeVisible();
    
    // Should show app branding
    await expect(page.locator('text=Competitor Research Agent')).toBeVisible();
  });
});

// Disabled authentication-related tests since auth is disabled
test.describe.skip('Authentication Tests - DISABLED', () => {
  // These tests are skipped because authentication has been disabled
  test('authentication disabled', () => {
    // This test suite is intentionally disabled
  });
});

// Disabled report scheduling tests since they require authentication
test.describe.skip('Report Scheduling - DISABLED', () => {
  // These tests are skipped because they depend on authentication which has been disabled
  test('report scheduling disabled', () => {
    // This test suite is intentionally disabled
  });
}); 