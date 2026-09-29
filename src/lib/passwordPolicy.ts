/**
 * Strong password policy used for every account (students, staff, administrators).
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 12 characters', test: (pw) => pw.length >= 12 },
  { id: 'upper', label: 'An uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'A lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'A number (0–9)', test: (pw) => /\d/.test(pw) },
  { id: 'symbol', label: 'A symbol such as ! @ # $ %', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  { id: 'space', label: 'No spaces', test: (pw) => pw.length > 0 && !/\s/.test(pw) },
];

const COMMON_WEAK = ['password', 'meridian', 'qwerty', '123456', 'admin', 'staff', 'student', 'letmein', 'welcome'];

export function checkPassword(pw: string, personalWords: string[] = []): { ok: boolean; failed: PasswordRule[]; message: string | null } {
  const failed = PASSWORD_RULES.filter((r) => !r.test(pw));
  if (failed.length > 0) {
    return { ok: false, failed, message: `Password is missing: ${failed.map((f) => f.label.toLowerCase()).join(', ')}.` };
  }
  const lower = pw.toLowerCase();
  const personal = personalWords
    .map((w) => (w || '').toLowerCase().trim())
    .filter((w) => w.length >= 4);
  if (personal.some((w) => lower.includes(w))) {
    return { ok: false, failed: [], message: 'Password must not contain your name, ID number or email.' };
  }
  // A password made only of a common word plus predictable padding is still weak
  const stripped = lower.replace(/[^a-z]/g, '');
  if (COMMON_WEAK.some((w) => stripped === w)) {
    return { ok: false, failed: [], message: 'Password is too common. Combine unrelated words instead.' };
  }
  return { ok: true, failed: [], message: null };
}

export function isStrongPassword(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

/** Generates a random password that satisfies every rule (used for admin-issued credentials). */
export function generateStrongPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;
  const rand = (set: string) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return set[buf[0] % set.length];
  };
  const chars = [rand(upper), rand(lower), rand(digits), rand(symbols)];
  while (chars.length < length) chars.push(rand(all));
  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
