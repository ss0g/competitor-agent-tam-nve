/**
 * Cross-Browser Critical Features Test
 * Task 6.2: Cross-Browser Testing
 * 
 * This file tests critical application features across different browsers
 * to ensure consistent functionality regardless of browser.
 */

import { test, expect, Page } from '@playwright/test';
import { compareScreenshot } from '../helpers/visualRegressionHelper';

// Test data
const TEST_PROJECT = {
  name: `Cross-browser Test ${Date.now()}`,
  productWebsite: 'https://cross-browser-test.com',
  competitor: {
    name: 'Cross-browser Competitor',
    website: 'https://cross-browser-competitor.com'
  }
};

// Timeouts
const TIMEOUTS = {
  navigation: 30000,   // 30 seconds for navigation
  interaction: 10000,  // 10 seconds for interactions
  generation: 75000    // 75 seconds for report generation
};

// Helper function to create a new project
async function createTestProject(page: Page): Promise<string> {
  // Navigate to project creation page
  await page.goto('/projects/new');
  await page.waitForLoadState('networkidle');
  
  // Fill form
  await page.fill('[data-testid="project-name"]', TEST_PROJECT.name);
  await page.fill('[data-testid="product-website"]', TEST_PROJECT.productWebsite);
  await page.fill('[data-testid="competitor-name-0"]', TEST_PROJECT.competitor.name);
  await page.fill('[data-testid="competitor-website-0"]', TEST_PROJECT.competitor.website);
  
  // Submit form
  await page.click('[data-testid="create-project"]');
  
  // Wait for navigation
  await page.waitForURL(/\/projects\/.*/, { timeout: TIMEOUTS.navigation });
  
  // Extract project ID from URL
  const projectUrl = page.url();
  const urlParts = projectUrl.split('/projects/');
  
  if (urlParts.length < 2 || !urlParts[1]) {
    throw new Error('Failed to extract project ID from URL');
  }
  
  return urlParts[1];
}

// Test suite for critical features
test.describe('Critical Features Cross-Browser Tests', () => {
  // Project creation test
  test('Project creation works across browsers', async ({ page, browserName }) => {
    test.setTimeout(TIMEOUTS.navigation);
    
    // Create project
    const projectId = await createTestProject(page);
    
    // Verify project creation was successful
    expect(projectId).toBeTruthy();
    await expect(page.locator('[data-testid="project-details"]')).toBeVisible();
    
    // Take screenshot of created project
    await compareScreenshot(page, {
      name: `project-created-${browserName}`,
      selector: 'main',
      maskDynamicContent: true,
    });
  });
  
  // Form validation test
  test('Form validation works across browsers', async ({ page, browserName }) => {
    await page.goto('/projects/new');
    
    // Try to submit empty form
    await page.click('[data-testid="create-project"]');
    
    // Check for validation errors (implementation varies by browser)
    await page.waitForTimeout(500);
    
    // Take screenshot of form with validation errors
    await compareScreenshot(page, {
      name: `form-validation-${browserName}`,
      selector: 'form',
      maskDynamicContent: true,
    });
    
    // Verify form wasn't submitted (still on same page)
    expect(page.url()).toContain('/projects/new');
  });
  
  // Progress indicators test
  test('Progress indicators work across browsers', async ({ page, browserName }) => {
    test.setTimeout(TIMEOUTS.generation);
    
    // Create a new project
    const projectId = await createTestProject(page);
    
    // Verify progress indicators appear
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
    
    // Check if status text is visible
    const statusElement = page.locator('[data-testid="status-text"]');
    if (await statusElement.isVisible()) {
      expect(await statusElement.textContent()).not.toBeNull();
    }
    
    // Take screenshot of progress UI
    await compareScreenshot(page, {
      name: `progress-indicators-${browserName}`,
      selector: '[data-testid="progress-container"]',
      maskDynamicContent: true,
    });
  });
  
  // Navigation component test
  test('Navigation works across browsers', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Check navigation items
    const navItems = page.locator('nav a');
    expect(await navItems.count()).toBeGreaterThan(0);
    
    // Click on a navigation item
    const reportsLink = page.locator('nav a[href*="/reports"]').first();
    if (await reportsLink.isVisible()) {
      await reportsLink.click();
      await page.waitForURL(/\/reports/, { timeout: TIMEOUTS.navigation });
      expect(page.url()).toContain('/reports');
    }
    
    // Take screenshot of navigation
    await compareScreenshot(page, {
      name: `navigation-${browserName}`,
      selector: 'nav',
      maskDynamicContent: true,
    });
  });
  
  // Error handling test
  test('Error handling works across browsers', async ({ page, browserName }) => {
    // Force a 404 error
    await page.goto('/nonexistent-page');
    
    // Check if error page is displayed
    const errorElement = page.locator('text=/not found|404/i');
    expect(await errorElement.isVisible()).toBeTruthy();
    
    // Take screenshot of error page
    await compareScreenshot(page, {
      name: `error-page-${browserName}`,
      selector: 'main',
      maskDynamicContent: true,
    });
  });
});

// Mobile-specific critical features
test.describe('Mobile Critical Features', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });
  
  test('Mobile navigation menu works', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Look for hamburger menu
    const menuToggle = page.locator('[data-testid="mobile-menu-toggle"], .hamburger, .menu-toggle');
    
    if (await menuToggle.isVisible()) {
      // Open mobile menu
      await menuToggle.click();
      await page.waitForTimeout(500); // Wait for animation
      
      // Check if menu items are visible
      const menuItems = page.locator('.mobile-menu a, .nav-menu a');
      expect(await menuItems.count()).toBeGreaterThan(0);
      
      // Take screenshot of open menu
      await compareScreenshot(page, {
        name: `mobile-menu-${browserName}`,
        selector: 'body',
        maskDynamicContent: true,
      });
      
      // Test menu item click
      await menuItems.first().click();
      await page.waitForNavigation({ timeout: TIMEOUTS.navigation });
    }
  });
  
  test('Mobile form interaction works', async ({ page, browserName }) => {
    await page.goto('/projects/new');
    
    // Test form interactions on mobile
    const nameInput = page.locator('[data-testid="project-name"]');
    await nameInput.click();
    
    // Verify focus behavior (virtual keyboard should appear on real devices)
    expect(await nameInput.evaluate(el => document.activeElement === el)).toBeTruthy();
    
    // Fill form
    await nameInput.fill(TEST_PROJECT.name);
    
    // Take screenshot of form with virtual keyboard focus
    await compareScreenshot(page, {
      name: `mobile-form-${browserName}`,
      selector: 'form',
      maskDynamicContent: true,
    });
  });
});

// Accessibility tests across browsers
test.describe('Cross-Browser Accessibility', () => {
  test('Focus indicators work across browsers', async ({ page, browserName }) => {
    await page.goto('/projects/new');
    
    // Test keyboard focus indicators
    const nameInput = page.locator('[data-testid="project-name"]');
    await nameInput.focus();
    
    // Take screenshot of focused element
    await compareScreenshot(page, {
      name: `focus-indicator-${browserName}`,
      selector: 'form',
      maskDynamicContent: true,
    });
    
    // Tab to next element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    // Take screenshot of next focused element
    await compareScreenshot(page, {
      name: `focus-indicator-next-${browserName}`,
      selector: 'form',
      maskDynamicContent: true,
    });
  });
}); 