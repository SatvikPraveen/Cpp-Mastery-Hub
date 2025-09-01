// File: frontend/src/services/storage.ts
// Extension: .ts (TypeScript Service)

export interface StorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
  compress?: boolean;
}

export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
  encrypted?: boolean;
  compressed?: boolean;
}

class StorageService {
  private readonly encryptionKey = 'cpp_learning_platform_v1';

  // Simple encryption (in production, use a proper encryption library)
  private encrypt(data: string): string {
    if (typeof window === 'undefined') return data;
    
    try {
      return btoa(data); // Base64 encoding as simple obfuscation
    } catch (error) {
      console.warn('Encryption failed:', error);
      return data;
    }
  }

  private decrypt(data: string): string {
    if (typeof window === 'undefined') return data;
    
    try {
      return atob(data); // Base64 decoding
    } catch (error) {
      console.warn('Decryption failed:', error);
      return data;
    }
  }

  // Simple compression using JSON stringify with replacer
  private compress(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      // Simple compression by removing unnecessary whitespace
      return jsonString.replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.warn('Compression failed:', error);
      return JSON.stringify(data);
    }
  }

  private decompress(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return data;
    }
  }

  private isExpired(item: StorageItem): boolean {
    if (!item.ttl) return false;
    return Date.now() - item.timestamp > item.ttl;
  }

  private prepareValue<T>(value: T, options: StorageOptions = {}): string {
    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      ttl: options.ttl,
      encrypted: options.encrypt,
      compressed: options.compress
    };

    let serialized = JSON.stringify(item);

    if (options.compress) {
      serialized = this.compress(item);
    }

    if (options.encrypt) {
      serialized = this.encrypt(serialized);
    }

    return serialized;
  }

  private parseValue<T>(data: string, defaultValue: T): T {
    try {
      let parsed = data;

      // Try to decrypt if it looks encrypted (base64)
      try {
        const decrypted = this.decrypt(data);
        if (decrypted !== data) {
          parsed = decrypted;
        }
      } catch {
        // Not encrypted or decryption failed, use original data
      }

      const item: StorageItem<T> = JSON.parse(parsed);

      // Check if item is expired
      if (this.isExpired(item)) {
        return defaultValue;
      }

      // Handle compressed data
      if (item.compressed) {
        return this.decompress(item.value as any);
      }

      return item.value;
    } catch (error) {
      console.warn('Failed to parse stored value:', error);
      return defaultValue;
    }
  }

  // LocalStorage methods
  setLocal<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const serializedValue = this.prepareValue(value, options);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Failed to set localStorage item:', error);
      return false;
    }
  }

  getLocal<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;

      return this.parseValue(item, defaultValue);
    } catch (error) {
      console.error('Failed to get localStorage item:', error);
      return defaultValue;
    }
  }

  removeLocal(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch