interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class FastCache {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 60): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  invalidate(prefixOrKey: string): void {
    if (this.store.has(prefixOrKey)) {
      this.store.delete(prefixOrKey);
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefixOrKey)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export const fastCache = new FastCache();
