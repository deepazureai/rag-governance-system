/**
 * In-memory LRU cache implementation
 * No external dependencies, handles TTL and size limits
 */

import { CacheEntry, LRUCacheConfig } from '../types/index.js';

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private config: LRUCacheConfig;
  private currentSize: number = 0;

  constructor(config: LRUCacheConfig) {
    this.config = config;
  }

  set(key: string, value: T, ttl?: number): void {
    const entryTTL = ttl ?? this.config.ttl ?? 3600000; // Default 1 hour
    const expiresAt = Date.now() + entryTTL;

    // Remove existing entry
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
    }

    // Add new entry
    this.cache.set(key, { 
      key,
      value, 
      timestamp: Date.now(),
      expiresAt 
    });
    this.accessOrder.push(key);

    // Evict old entries if over size limit
    this.evictIfNeeded();
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      return null;
    }

    // Move to end (most recently used)
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSize = 0;
  }

  private evictIfNeeded(): void {
    // Estimate size - simple approximation
    let estimatedSize = 0;

    for (const entry of this.cache.values()) {
      estimatedSize += JSON.stringify(entry.value).length;
    }

    this.currentSize = estimatedSize;

    // Evict oldest entries until under limit
    while (this.currentSize > this.config.maxSize && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  getStats(): { size: number; entries: number; hitRate: number } {
    return {
      size: this.currentSize,
      entries: this.cache.size,
      hitRate: 0, // Can be enhanced with metrics
    };
  }
}

// Singleton cache instance
let cacheInstance: LRUCache<unknown> | null = null;

export function initCache(config: LRUCacheConfig): LRUCache<unknown> {
  cacheInstance = new LRUCache(config);
  return cacheInstance;
}

export function getCache(): LRUCache<unknown> {
  if (!cacheInstance) {
    cacheInstance = new LRUCache({ maxSize: 1024 * 1024 * 1024, ttl: 3600000 });
  }
  return cacheInstance;
}
