import { test, expect } from '@playwright/test';

test.describe('Library Management - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should export library metadata', async ({ page }) => {
    // Scroll to Data section
    await page.getByRole('heading', { name: 'Data' }).scrollIntoViewIfNeeded();
    
    // Test export library
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Library' }).click();
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/ebook-reader-library-\d{4}-\d{2}-\d{2}\.json/);
  });

  test('should import library metadata', async ({ page }) => {
    // Scroll to Data section
    await page.getByRole('heading', { name: 'Data' }).scrollIntoViewIfNeeded();
    
    // Create mock library data
    const mockLibraryData = {
      books: [
        {
          id: 'book-1',
          fileId: 'file-1',
          metadata: {
            title: 'Test Book',
            author: 'Test Author',
            description: 'A test book for smoke testing'
          },
          isFavorite: false,
          dateAdded: new Date().toISOString(),
          collectionIds: []
        }
      ],
      collections: [
        {
          id: 'col-1',
          name: 'Test Collection',
          bookIds: ['book-1'],
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString()
        }
      ],
      activity: []
    };
    
    // Import library data
    const fileInput = page.locator('input[aria-label="Import library metadata file"]');
    await fileInput.setInputFiles({
      name: 'library.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(mockLibraryData))
    });
    
    // Handle success dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Library metadata imported successfully');
      dialog.accept();
    });
  });

  test('should handle invalid library import', async ({ page }) => {
    // Scroll to Data section
    await page.getByRole('heading', { name: 'Data' }).scrollIntoViewIfNeeded();
    
    // Try to import invalid JSON
    const fileInput = page.locator('input[aria-label="Import library metadata file"]');
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not valid json')
    });
    
    // Should show error dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Failed to import library');
      dialog.accept();
    });
  });
});

test.describe('Reader Integration - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should configure reader settings', async ({ page }) => {
    // Configure appearance settings
    await page.selectOption('#theme-mode', 'sepia');
    await page.selectOption('#font-family', 'Arial, sans-serif');
    await page.fill('#font-size', '18');
    await page.fill('#line-height', '1.8');
    
    // Configure reading settings
    await page.selectOption('#page-layout', 'double');
    await page.selectOption('#reading-mode', 'continuous');
    await page.getByLabel('Enable Page Transitions').check();
    await page.getByLabel('Auto-save Reading Progress').check();
    
    // Verify settings are applied (would affect reader in real app)
    await expect(page.locator('#theme-mode')).toHaveValue('sepia');
    await expect(page.locator('#font-size')).toHaveValue('18');
  });

  test('should configure translation for reader', async ({ page }) => {
    // Enable translation
    await page.getByLabel('Enable Translation').check();
    
    // Configure translation settings
    await page.fill('#target-language', 'es');
    await page.selectOption('#translation-provider', 'google');
    await page.fill('#api-key', 'test-google-api-key');
    
    // Verify settings
    await expect(page.locator('#target-language')).toHaveValue('es');
    await expect(page.locator('#translation-provider')).toHaveValue('google');
    await expect(page.locator('#api-key')).toHaveValue('test-google-api-key');
  });
});