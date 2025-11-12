import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper color contrast', async ({ page }) => {
    // Test light theme
    await page.selectOption('#theme-mode', 'light');
    const lightThemeResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    const colorContrastViolations = lightThemeResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    expect(colorContrastViolations).toHaveLength(0);

    // Test dark theme
    await page.selectOption('#theme-mode', 'dark');
    const darkThemeResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    const darkColorViolations = darkThemeResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    expect(darkColorViolations).toHaveLength(0);

    // Test sepia theme
    await page.selectOption('#theme-mode', 'sepia');
    const sepiaThemeResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    const sepiaColorViolations = sepiaThemeResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    expect(sepiaColorViolations).toHaveLength(0);
  });

  test('should be fully keyboard navigable', async ({ page }) => {
    // Test Tab navigation through all interactive elements
    const interactiveElements = page.locator(
      'button, select, input[type="text"], input[type="range"], input[type="color"], input[type="checkbox"]'
    );
    
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);

    // Navigate through all elements
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab');
      
      // Check that an element is focused
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Check that focused element is interactive
      const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
      expect(['button', 'select', 'input']).toContain(tagName);
    }
  });

  test('should have proper ARIA labels and descriptions', async ({ page }) => {
    // Check form controls have proper labels
    const formControls = page.locator('input, select, textarea');
    const count = await formControls.count();
    
    for (let i = 0; i < count; i++) {
      const control = formControls.nth(i);
      const hasLabel = await control.evaluate(el => {
        const labels = ['aria-label', 'aria-labelledby', 'id'];
        return labels.some(attr => el.hasAttribute(attr));
      });
      
      expect(hasLabel).toBeTruthy();
    }

    // Check range inputs have proper ARIA attributes
    const rangeInputs = page.locator('input[type="range"]');
    const rangeCount = await rangeInputs.count();
    
    for (let i = 0; i < rangeCount; i++) {
      const range = rangeInputs.nth(i);
      await expect(range).toHaveAttribute('aria-valuemin');
      await expect(range).toHaveAttribute('aria-valuemax');
      await expect(range).toHaveAttribute('aria-valuenow');
    }
  });

  test('should have proper heading structure', async ({ page }) => {
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingLevels = await headings.evaluateAll(elements => 
      elements.map(el => parseInt(el.tagName.substring(1)))
    );
    
    // Should start with h1 and not skip levels
    expect(headingLevels[0]).toBe(1);
    
    for (let i = 1; i < headingLevels.length; i++) {
      const current = headingLevels[i];
      const previous = headingLevels[i - 1];
      expect(current - previous).toBeLessThanOrEqual(1);
    }
  });

  test('should handle focus management during interactions', async ({ page }) => {
    // Test focus stays in appropriate elements
    await page.getByRole('button', { name: 'Export Settings' }).focus();
    await expect(page.getByRole('button', { name: 'Export Settings' })).toBeFocused();
    
    // Test focus management in modal-like situations
    await page.getByRole('button', { name: 'Reset to Defaults' }).click();
    
    // After clicking reset, focus should stay on the button
    await expect(page.getByRole('button', { name: 'Click again to confirm' })).toBeFocused();
  });

  test('should have proper semantic landmarks', async ({ page }) => {
    // Check for main landmark
    await expect(page.locator('main, [role="main"]')).toBeVisible();
    
    // Check for proper sectioning
    const sections = page.locator('section');
    const sectionCount = await sections.count();
    expect(sectionCount).toBeGreaterThan(0);
    
    // Each section should have a heading
    for (let i = 0; i < sectionCount; i++) {
      const section = sections.nth(i);
      const heading = section.locator('h1, h2, h3, h4, h5, h6');
      await expect(heading).toHaveCount(1);
    }
  });

  test('should work with screen readers', async ({ page }) => {
    // Test that form controls are properly announced
    const themeSelect = page.locator('#theme-mode');
    await themeSelect.focus();
    
    // Should have accessible name
    const accessibleName = await themeSelect.evaluate(el => 
      el.getAttribute('aria-label') || 
      el.getAttribute('aria-labelledby') ||
      document.querySelector(`label[for="${el.id}"]`)?.textContent
    );
    expect(accessibleName).toBeTruthy();
    
    // Test that state changes are announced
    const translationCheckbox = page.getByLabel('Enable Translation');
    await translationCheckbox.check();
    
    // Should be checked
    await expect(translationCheckbox).toBeChecked();
  });

  test('should have proper skip links and navigation', async ({ page }) => {
    // Check if there are skip links (good practice)
    const skipLinks = page.locator('a[href^="#"]');
    const skipLinkCount = await skipLinks.count();
    
    // If skip links exist, they should be visible when focused
    for (let i = 0; i < skipLinkCount; i++) {
      const link = skipLinks.nth(i);
      await link.focus();
      await expect(link).toBeVisible();
    }
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Simulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Test that animations are disabled
    const button = page.getByRole('button', { name: 'Export Settings' });
    await button.hover();
    
    // Should not have transform animations
    const transform = await button.evaluate(el => 
      getComputedStyle(el).transform
    );
    expect(transform).toBe('none');
  });

  test('should work with high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ contrast: 'high' });
    
    // Elements should still be visible and usable
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Settings' })).toBeVisible();
    await expect(page.locator('#theme-mode')).toBeVisible();
  });
});