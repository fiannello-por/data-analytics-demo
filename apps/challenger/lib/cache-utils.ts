// apps/challenger/lib/cache-utils.ts

/**
 * Deterministic fingerprint for cache key differentiation.
 * Serialises the given parts to JSON and returns a short base64url hash.
 */
export function cacheFingerprint(...parts: unknown[]): string {
  return Buffer.from(JSON.stringify(parts)).toString('base64url').slice(0, 16);
}
