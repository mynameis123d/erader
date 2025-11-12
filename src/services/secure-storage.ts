export interface SecureStorageData {
  [key: string]: string;
}

class SecureStorage {
  private readonly storageKey = "ebook-reader-secure";
  private encryptionKey: string | null = null;

  constructor() {
    this.initializeEncryption();
  }

  private async initializeEncryption(): Promise<void> {
    try {
      // Try to get existing encryption key from sessionStorage
      const existingKey = sessionStorage.getItem("ebook-reader-encryption-key");
      
      if (existingKey) {
        this.encryptionKey = existingKey;
      } else {
        // Generate a new encryption key for this session
        this.encryptionKey = this.generateSessionKey();
        sessionStorage.setItem("ebook-reader-encryption-key", this.encryptionKey);
      }
    } catch (error) {
      console.warn("Failed to initialize encryption, falling back to plain storage:", error);
      this.encryptionKey = null;
    }
  }

  private generateSessionKey(): string {
    // Generate a random session key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      return btoa(data); // Fallback to base64
    }

    try {
      // Simple XOR encryption for demo purposes
      // In production, use Web Crypto API with AES-GCM
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(this.encryptionKey);
      const dataBytes = encoder.encode(data);
      
      const encrypted = new Uint8Array(dataBytes.length);
      for (let i = 0; i < dataBytes.length; i++) {
        encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      
      return btoa(String.fromCharCode(...encrypted));
    } catch (error) {
      console.warn("Encryption failed, using base64 fallback:", error);
      return btoa(data);
    }
  }

  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      return atob(encryptedData); // Fallback from base64
    }

    try {
      const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(this.encryptionKey);
      
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
      }
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.warn("Decryption failed, trying base64 fallback:", error);
      try {
        return atob(encryptedData);
      } catch {
        return encryptedData;
      }
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const existingData = await this.getAll();
      existingData[key] = value;
      
      const encryptedData = await this.encrypt(JSON.stringify(existingData));
      localStorage.setItem(this.storageKey, encryptedData);
    } catch (error) {
      console.error("Failed to store secure data:", error);
      throw new Error("Failed to securely store data");
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const data = await this.getAll();
      return data[key] || null;
    } catch (error) {
      console.error("Failed to retrieve secure data:", error);
      return null;
    }
  }

  async getAll(): Promise<SecureStorageData> {
    try {
      const encryptedData = localStorage.getItem(this.storageKey);
      if (!encryptedData) {
        return {};
      }

      const decryptedData = await this.decrypt(encryptedData);
      return JSON.parse(decryptedData) as SecureStorageData;
    } catch (error) {
      console.error("Failed to decrypt secure data:", error);
      return {};
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const data = await this.getAll();
      delete data[key];
      
      if (Object.keys(data).length === 0) {
        localStorage.removeItem(this.storageKey);
      } else {
        const encryptedData = await this.encrypt(JSON.stringify(data));
        localStorage.setItem(this.storageKey, encryptedData);
      }
    } catch (error) {
      console.error("Failed to remove secure data:", error);
      throw new Error("Failed to remove secure data");
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }

  // Utility method to mask API keys for display
  maskApiKey(apiKey: string | null | undefined): string {
    if (!apiKey) return "";
    if (apiKey.length <= 8) return "*".repeat(apiKey.length);
    return apiKey.substring(0, 4) + "*".repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  }
}

export const secureStorage = new SecureStorage();