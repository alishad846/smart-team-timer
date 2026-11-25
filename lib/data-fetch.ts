"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const PENDING_REQUESTS = new Map<string, Promise<any>>();

/**
 * Generate a cache key from URL and params
 */
function getCacheKey(url: string, params?: Record<string, any>): string {
  const searchParams = params ? new URLSearchParams(params).toString() : "";
  return `${url}?${searchParams}`;
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(entry: CacheEntry<any>): boolean {
  return Date.now() < entry.expiresAt;
}

/**
 * Fetch data with caching and deduplication
 */
export async function fetchWithCache<T>(
  url: string,
  options: RequestInit = {},
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cacheKey = getCacheKey(url);

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  // Deduplicate in-flight requests
  const pending = PENDING_REQUESTS.get(cacheKey);
  if (pending) {
    return pending;
  }

  // Make the request
  const promise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache the result
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      });

      return data;
    } finally {
      PENDING_REQUESTS.delete(cacheKey);
    }
  })();

  PENDING_REQUESTS.set(cacheKey, promise);
  return promise;
}

/**
 * Invalidate cache for a specific URL pattern
 */
export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear();
  PENDING_REQUESTS.clear();
}

/**
 * Hook for client-side data fetching with caching
 */
export function useCachedData<T>(
  url: string,
  params?: Record<string, any>,
  options: {
    ttl?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  } = {}
) {
  const { ttl = DEFAULT_TTL, enabled = true, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cacheKey = getCacheKey(url, params);
    const cached = cache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    // Create new abort controller
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const result = await fetchWithCache<T>(url, {
        signal: abortRef.current.signal,
      }, ttl);

      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err);
        onError?.(err);
      }
    } finally {
      if (abortRef.current?.signal.aborted === false) {
        setLoading(false);
      }
    }
  }, [url, params, ttl, enabled, onError]);

  useEffect(() => {
    fetchData();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    // Invalidate cache for this key
    invalidateCache(getCacheKey(url, params));
    fetchData();
  }, [url, params, fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Hook for infinite scrolling / pagination with caching
 */
export function usePaginatedData<T>(
  baseUrl: string,
  page: number,
  size: number,
  options: {
    ttl?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  } = {}
) {
  const { ttl = DEFAULT_TTL, enabled = true, onError } = options;
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const params = { page, size };
    const cacheKey = getCacheKey(baseUrl, params);
    const cached = cache.get(cacheKey);

    if (cached && isCacheValid(cached)) {
      setData(cached.data.items || []);
      setTotal(cached.data.total || 0);
      setLoading(false);
      return;
    }

    abortRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams({ page: String(page), size: String(size) }).toString();
      const url = `${baseUrl}?${searchParams}`;

      const result = await fetchWithCache<{ items: T[]; total: number }>(url, {
        signal: abortRef.current.signal,
      }, ttl);

      setData(result.items);
      setTotal(result.total);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err);
        onError?.(err);
      }
    } finally {
      if (abortRef.current?.signal.aborted === false) {
        setLoading(false);
      }
    }
  }, [baseUrl, page, size, ttl, enabled, onError]);

  useEffect(() => {
    fetchData();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    const params = { page, size };
    invalidateCache(getCacheKey(baseUrl, params));
    fetchData();
  }, [baseUrl, page, size, fetchData]);

  return { data, total, loading, error, refetch };
}