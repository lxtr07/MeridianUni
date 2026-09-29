/**
 * Password Hashing Utility — ScholarFlow
 * Uses the Web Crypto API (SHA-256) built into the browser.
 * No external dependencies required.
 */

/**
 * Hash a plaintext password using SHA-256.
 * Returns a lowercase hex digest string.
 */
export async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a plaintext password against a stored SHA-256 hex hash.
 * Returns true if they match.
 */
export async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  const hashed = await hashPassword(plain);
  return hashed === storedHash;
}

/**
 * Pre-computed SHA-256 hashes for the default seeded credentials.
 * staff123 → 10176e7b...
 * admin123 → 240be518...
 */
export const DEFAULT_STAFF_PASSWORD_HASH =
  '10176e7b7b24d317acfcf8d2064cfd2f24e154f7b5a96603077d5ef813d6a6b6';
export const DEFAULT_ADMIN_PASSWORD_HASH =
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

/**
 * Generate a unique session token for single-device session tracking.
 */
export function generateSessionToken(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `sess_${time}_${rand}`;
}

