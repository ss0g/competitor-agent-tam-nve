import { test, expect } from '@playwright/test';

test.describe('Report Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to login page and authenticate
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create a new report', async ({ page }) => {
    // Navigate to report creation page
    await page.click('text=New Report');
    await expect(page).toHaveURL('/reports/new');

    // Fill in report details
    await page.fill('[name="competitorId"]', 'test-competitor');
    await page.fill('[name="timeframe"]', '30');
    await page.fill('[name="changeLog"]', 'Initial report generation');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for report generation
    await expect(page.locator('.report-status')).toContainText('Processing');
    await expect(page.locator('.report-status'), 'Report should be generated').toContainText('Complete', { timeout: 30000 });

    // Verify report sections are present
    await expect(page.locator('h2:text("Executive Summary")')).toBeVisible();
    await expect(page.locator('h2:text("Significant Changes")')).toBeVisible();
    await expect(page.locator('h2:text("Trend Analysis")')).toBeVisible();
    await expect(page.locator('h2:text("Strategic Recommendations")')).toBeVisible();
  });

  test('should handle validation errors', async ({ page }) => {
    await page.click('text=New Report');
    
    // Submit without required fields
    await page.click('button[type="submit"]');

    // Check validation messages
    await expect(page.locator('text=Competitor ID is required')).toBeVisible();
    await expect(page.locator('text=Timeframe is required')).toBeVisible();
  });

  test('should display error for invalid competitor', async ({ page }) => {
    await page.click('text=New Report');
    
    // Fill in invalid competitor
    await page.fill('[name="competitorId"]', 'invalid-id');
    await page.fill('[name="timeframe"]', '30');
    await page.click('button[type="submit"]');

    // Check error message
    await expect(page.locator('.error-message')).toContainText('Competitor not found');
  });

  test('should allow report version management', async ({ page }) => {
    // Create initial report
    await page.click('text=New Report');
    await page.fill('[name="competitorId"]', 'test-competitor');
    await page.fill('[name="timeframe"]', '30');
    await page.click('button[type="submit"]');
    await expect(page.locator('.report-status')).toContainText('Complete', { timeout: 30000 });

    // Create new version
    await page.click('text=New Version');
    await page.fill('[name="changeLog"]', 'Updated analysis');
    await page.click('button:text("Create Version")');

    // Verify version is created
    await expect(page.locator('.version-number')).toContainText('2.0');
    await expect(page.locator('.version-changelog')).toContainText('Updated analysis');

    // Switch between versions
    await page.click('text=Version 1.0');
    await expect(page.locator('.version-number')).toContainText('1.0');
  });

  test('should export report as PDF', async ({ page }) => {
    // Navigate to existing report
    await page.goto('/reports/test-report');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:text("Export PDF")');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/report.*\.pdf$/);
  });
});

test.describe('Report Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('should create a scheduled report', async ({ page }) => {
    // Navigate to schedule management
    await page.click('text=Schedules');
    await page.click('text=New Schedule');

    // Set up schedule
    await page.fill('[name="competitorId"]', 'test-competitor');
    await page.fill('[name="cronExpression"]', '0 0 * * *');
    await page.fill('[name="recipients"]', 'test@example.com');
    await page.click('button:text("Create Schedule")');

    // Verify schedule is created
    await expect(page.locator('.schedule-status')).toContainText('Active');
    await expect(page.locator('.schedule-expression')).toContainText('Daily at midnight');
  });

  test('should manage existing schedules', async ({ page }) => {
    await page.click('text=Schedules');
    
    // Pause schedule
    await page.click('.schedule-actions >> text=Pause');
    await expect(page.locator('.schedule-status')).toContainText('Paused');

    // Resume schedule
    await page.click('.schedule-actions >> text=Resume');
    await expect(page.locator('.schedule-status')).toContainText('Active');

    // Delete schedule
    await page.click('.schedule-actions >> text=Delete');
    await page.click('button:text("Confirm")');
    await expect(page.locator('text=No schedules found')).toBeVisible();
  });
}); 