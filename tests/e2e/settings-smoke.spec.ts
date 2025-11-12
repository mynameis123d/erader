import { test, expect } from '@playwright/test';

test.describe('Settings Page - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load settings page and display main sections', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Settings');
    
    // Check main sections are present
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Translation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Data' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test keyboard navigation through form controls
    await page.keyboard.press('Tab');
    await expect(page.locator('#theme-mode')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#font-family')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#font-size')).toBeFocused();
  });

  test('should change theme settings', async ({ page }) => {
    // Change theme to dark
    await page.selectOption('#theme-mode', 'dark');
    
    // Verify theme is applied (check for dark theme class)
    await expect(page.locator('body')).toHaveClass(/theme-dark/);
    
    // Change font size
    const fontSizeInput = page.locator('#font-size');
    await fontSizeInput.fill('20');
    await expect(fontSizeInput).toHaveValue('20');
  });

  test('should handle translation settings', async ({ page }) => {
    // Enable translation
    await page.getByLabel('Enable Translation').check();
    
    // Verify translation options appear
    await expect(page.locator('#target-language')).toBeVisible();
    await expect(page.locator('#translation-provider')).toBeVisible();
    await expect(page.locator('#api-key')).toBeVisible();
    
    // Fill translation settings
    await page.fill('#target-language', 'es');
    await page.selectOption('#translation-provider', 'deepl');
    await page.fill('#api-key', 'test-api-key-123');
    
    // Toggle API key visibility
    await page.getByLabel('Show API key').click();
    await expect(page.locator('#api-key')).toHaveValue('test-api-key-123');
    
    await page.getByLabel('Hide API key').click();
    await expect(page.locator('#api-key')).toHaveAttribute('type', 'password');
  });

  test('should handle reading settings', async ({ page }) => {
    // Change page layout
    await page.selectOption('#page-layout', 'double');
    
    // Change reading mode
    await page.selectOption('#reading-mode', 'continuous');
    
    // Adjust history retention
    const historySlider = page.locator('#history-retention');
    await historySlider.fill('180');
    await expect(historySlider).toHaveValue('180');
    
    // Toggle page transitions
    await page.getByLabel('Enable Page Transitions').check();
    
    // Toggle auto-save
    await page.getByLabel('Auto-save Reading Progress').check();
  });

  test('should export and import settings', async ({ page }) => {
    // Test export settings
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Settings' }).click();
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/ebook-reader-settings-\d{4}-\d{2}-\d{2}\.json/);
    
    // Test import settings
    const fileInput = page.locator('input[aria-label="Import settings file"]');
    await fileInput.setInputFiles({
      name: 'test-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        theme: { mode: 'sepia', fontSize: 18 },
        reading: { defaultPageLayout: 'scroll' },
        translation: { enabled: true, targetLanguage: 'fr' }
      }))
    });
    
    // Handle the success dialog (would appear in real app)
    page.on('dialog', dialog => dialog.accept());
  });

  test('should handle reset settings with confirmation', async ({ page }) => {
    await page.getByRole('button', { name: 'Reset to Defaults' }).click();
    
    // Should show confirmation button
    await expect(page.getByRole('button', { name: 'Click again to confirm' })).toBeVisible();
    
    // Click again to confirm
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Click again to confirm' }).click();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile layout
    await expect(page.locator('.settings-section')).toBeVisible();
    
    // Buttons should be full width on mobile
    const exportButton = page.getByRole('button', { name: 'Export Settings' });
    const buttonBox = await exportButton.boundingBox();
    expect(buttonBox?.width).toBeGreaterThan(300); // Should be close to full width
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for proper ARIA labels
    await expect(page.locator('#theme-mode')).toHaveAttribute('aria-describedby');
    await expect(page.locator('main')).toHaveRole('main');
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2');
    const headingTexts = await headings.allTextContents();
    expect(headingTexts[0]).toBe('Settings'); // h1
    expect(headingTexts).toContain('Appearance'); // h2
    expect(headingTexts).toContain('Reading'); // h2
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+S for export
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Control+s');
    await downloadPromise;
    
    // Test Ctrl+O for import
    const fileInput = page.locator('input[aria-label="Import settings file"]');
    await page.keyboard.press('Control+o');
    // File input should be triggered (would open file dialog in real browser)
  });
});

test.describe('Error Handling', () => {
  test('should handle invalid import file', async ({ page }) => {
    await page.goto('/');
    
    const fileInput = page.locator('input[aria-label="Import settings file"]');
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not valid json')
    });
    
    // Should show error dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Failed to import settings');
      dialog.accept();
    });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to export (should still work as it's client-side)
    await page.getByRole('button', { name: 'Export Settings' }).click();
    
    // Should still work since export is client-side
    await expect(page.getByRole('button', { name: 'Export Settings' })).toBeVisible();
  });
});