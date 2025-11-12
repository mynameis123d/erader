import type { TranslationSettings } from "../types";

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
  cached: boolean;
}

export interface TranslationProvider {
  name: string;
  translate(request: TranslationRequest): Promise<TranslationResult>;
  detectLanguage(text: string): Promise<string>;
  isConfigured(settings: TranslationSettings): boolean;
}

export class TranslationService {
  private providers: Map<string, TranslationProvider> = new Map();
  private cache: Map<string, TranslationResult> = new Map();
  private cacheMaxSize = 1000;
  private rateLimiter: Map<string, number[]> = new Map();
  private rateLimitWindow = 60000; // 1 minute
  private maxRequestsPerWindow = 100;

  constructor() {
    this.registerProvider(new GoogleTranslationProvider());
    this.registerProvider(new DeepLTranslationProvider());
    this.registerProvider(new LibreTranslateProvider());
    this.registerProvider(new MockTranslationProvider());
  }

  registerProvider(provider: TranslationProvider): void {
    this.providers.set(provider.name, provider);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async translate(
    text: string,
    settings: TranslationSettings,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    if (!text.trim()) {
      throw new Error("Text to translate cannot be empty");
    }

    const provider = this.providers.get(settings.provider);
    if (!provider) {
      throw new Error(`Translation provider '${settings.provider}' not found`);
    }

    if (!provider.isConfigured(settings)) {
      throw new Error(`Translation provider '${settings.provider}' is not properly configured`);
    }

    // Check rate limit
    if (!this.checkRateLimit(settings.provider)) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text, sourceLanguage || "auto", settings.targetLanguage, settings.provider);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const request: TranslationRequest = {
        text,
        sourceLanguage,
        targetLanguage: settings.targetLanguage,
      };

      const result = await provider.translate(request);
      
      // Cache the result
      this.cacheResult(cacheKey, result);

      return { ...result, cached: false };
    } catch (error) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async detectLanguage(text: string, settings: TranslationSettings): Promise<string> {
    const provider = this.providers.get(settings.provider);
    if (!provider) {
      throw new Error(`Translation provider '${settings.provider}' not found`);
    }

    if (!provider.isConfigured(settings)) {
      throw new Error(`Translation provider '${settings.provider}' is not properly configured`);
    }

    return provider.detectLanguage(text);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private getCacheKey(text: string, sourceLanguage: string, targetLanguage: string, provider: string): string {
    return `${provider}:${sourceLanguage}:${targetLanguage}:${text.substring(0, 100)}`;
  }

  private cacheResult(key: string, result: TranslationResult): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, result);
  }

  private checkRateLimit(provider: string): boolean {
    const now = Date.now();
    const requests = this.rateLimiter.get(provider) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.rateLimitWindow);
    
    if (validRequests.length >= this.maxRequestsPerWindow) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimiter.set(provider, validRequests);
    
    return true;
  }
}

// Google Translate Provider (Placeholder)
class GoogleTranslationProvider implements TranslationProvider {
  name = "google";

  isConfigured(settings: TranslationSettings): boolean {
    return !!(settings.apiKey && settings.targetLanguage);
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    // Placeholder implementation - replace with actual Google Translate API
    const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify({
        q: request.text,
        source: request.sourceLanguage || "auto",
        target: request.targetLanguage,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const translation = data.data.translations[0];

    return {
      originalText: request.text,
      translatedText: translation.translatedText,
      sourceLanguage: translation.detectedSourceLanguage || request.sourceLanguage || "auto",
      targetLanguage: request.targetLanguage,
      provider: this.name,
      cached: false,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async detectLanguage(_text: string): Promise<string> {
    // Placeholder implementation
    return "en";
  }

  private getApiKey(): string {
    // This would be retrieved from secure storage
    return "";
  }
}

// DeepL Provider (Placeholder)
class DeepLTranslationProvider implements TranslationProvider {
  name = "deepl";

  isConfigured(settings: TranslationSettings): boolean {
    return !!(settings.apiKey && settings.targetLanguage);
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    // Placeholder implementation - replace with actual DeepL API
    return {
      originalText: request.text,
      translatedText: `[DeepL] ${request.text}`,
      sourceLanguage: request.sourceLanguage || "auto",
      targetLanguage: request.targetLanguage,
      provider: this.name,
      cached: false,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async detectLanguage(_text: string): Promise<string> {
    return "en";
  }
}

// LibreTranslate Provider (Self-hosted)
class LibreTranslateProvider implements TranslationProvider {
  name = "libretranslate";

  isConfigured(settings: TranslationSettings): boolean {
    return !!settings.targetLanguage;
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    // Placeholder implementation - replace with actual LibreTranslate API
    return {
      originalText: request.text,
      translatedText: `[LibreTranslate] ${request.text}`,
      sourceLanguage: request.sourceLanguage || "auto",
      targetLanguage: request.targetLanguage,
      provider: this.name,
      cached: false,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async detectLanguage(_text: string): Promise<string> {
    return "en";
  }
}

// Mock Provider for testing
class MockTranslationProvider implements TranslationProvider {
  name = "mock";

  isConfigured(settings: TranslationSettings): boolean {
    return !!settings.targetLanguage;
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      originalText: request.text,
      translatedText: `[Mock Translation to ${request.targetLanguage}] ${request.text}`,
      sourceLanguage: request.sourceLanguage || "auto",
      targetLanguage: request.targetLanguage,
      provider: this.name,
      cached: false,
    };
  }

  async detectLanguage(text: string): Promise<string> {
    // Simple mock detection based on text characteristics
    if (/[а-я]/i.test(text)) return "ru";
    if (/[ñáéíóú]/i.test(text)) return "es";
    if (/[äöüß]/i.test(text)) return "de";
    if (/[àâçéèêëîïôùû]/i.test(text)) return "fr";
    return "en";
  }
}

export const translationService = new TranslationService();