import { describe, it, expect, vi, beforeEach } from "vitest";
import { translationService } from "../src/services/translation-service";
import type { TranslationSettings } from "../src/types";

describe("TranslationService", () => {
  beforeEach(() => {
    // Clear cache before each test
    translationService.clearCache();
    // Reset rate limiter by accessing private method (for testing only)
    (translationService as any).rateLimiter.clear();
  });

  describe("Provider Management", () => {
    it("should return available providers", () => {
      const providers = translationService.getAvailableProviders();
      expect(providers).toContain("google");
      expect(providers).toContain("deepl");
      expect(providers).toContain("libretranslate");
      expect(providers).toContain("mock");
    });

    it("should have mock provider configured for testing", () => {
      const providers = translationService.getAvailableProviders();
      expect(providers).toContain("mock");
    });
  });

  describe("Mock Translation", () => {
    it("should translate text using mock provider", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "es",
        provider: "mock",
      };

      const result = await translationService.translate("Hello world", settings);

      expect(result).toEqual({
        originalText: "Hello world",
        translatedText: "[Mock Translation to es] Hello world",
        sourceLanguage: "auto",
        targetLanguage: "es",
        provider: "mock",
        cached: false,
      });
    });

    it("should detect language using mock provider", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "en",
        provider: "mock",
      };

      const detectedLanguage = await translationService.detectLanguage("Bonjour le monde", settings);
      expect(detectedLanguage).toBe("en"); // Mock returns "en" for most text
    });

    it("should cache translation results", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "fr",
        provider: "mock",
      };

      // First translation
      const result1 = await translationService.translate("Test text", settings);
      expect(result1.cached).toBe(false);

      // Second translation should use cache
      const result2 = await translationService.translate("Test text", settings);
      expect(result2.cached).toBe(true);
      expect(result2.translatedText).toBe(result1.translatedText);
    });
  });

  describe("Error Handling", () => {
    it("should throw error for empty text", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "en",
        provider: "mock",
      };

      await expect(translationService.translate("", settings)).rejects.toThrow(
        "Text to translate cannot be empty"
      );
    });

    it("should throw error for whitespace-only text", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "en",
        provider: "mock",
      };

      await expect(translationService.translate("   ", settings)).rejects.toThrow(
        "Text to translate cannot be empty"
      );
    });

    it("should throw error for invalid provider", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "en",
        provider: "invalid" as any,
      };

      await expect(translationService.translate("Test", settings)).rejects.toThrow(
        "Translation provider 'invalid' not found"
      );
    });
  });

  describe("Rate Limiting", () => {
    it("should respect rate limits", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "en",
        provider: "mock",
      };

      // Mock a provider that would be rate limited
      // For testing, we'll need to make many requests quickly
      const promises = Array(150).fill(null).map(() => 
        translationService.translate(`Test ${Math.random()}`, settings)
      );

      const results = await Promise.allSettled(promises);
      const failures = results.filter(result => result.status === "rejected");
      
      // Some requests should fail due to rate limiting
      expect(failures.length).toBeGreaterThan(0);
      
      failures.forEach(failure => {
        if (failure.status === "rejected") {
          expect(failure.reason.message).toContain("Rate limit exceeded");
        }
      });
    }, 10000);
  });

  describe("Cache Management", () => {
    it("should clear cache", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "en",
        provider: "mock",
      };

      // Add something to cache
      await translationService.translate("Test", settings);
      
      // Clear cache
      translationService.clearCache();
      
      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Next translation should not be cached
      const result = await translationService.translate("Test", settings);
      expect(result.cached).toBe(false);
    });

    it("should handle cache gracefully", async () => {
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "en",
        provider: "mock",
      };

      // Add a translation to cache
      const result1 = await translationService.translate("Test", settings);
      expect(result1.cached).toBe(false);

      // Same translation should use cache
      const result2 = await translationService.translate("Test", settings);
      expect(result2.cached).toBe(true);
    });
  });
});