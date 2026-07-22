import { createHash } from 'crypto';

/**
 * Generate a deterministic UUID v4-format string from a design ID and path.
 * The same inputs always produce the same output, which makes re-compilation
 * idempotent and enables diffing between versions.
 */
export function deterministicUuid(designId: string, ...pathParts: string[]): string {
  const input = [designId, ...pathParts].join('/');
  const hash = createHash('sha256').update(input).digest('hex');

  // Format as UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
  // Use first 32 hex chars of hash, set version and variant bits
  const h = hash.slice(0, 32);
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '4' + h.slice(13, 16),
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}
