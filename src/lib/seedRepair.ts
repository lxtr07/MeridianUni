/**
 * Demo-account repair.
 *
 * Seeded demo accounts can go stale in a browser/Firestore that was set up by an older build:
 *   1. They still carry the old built-in passwords (staff123 / admin123).
 *   2. A seeded person was re-keyed to a new id (e.g. the System Administrator moved from
 *      `usr-admin-001` to `usr-sysadmin-001`), leaving two records for the same person (same email or staff ID).
 *      Sign-in picks the first match, so the stale record silently wins.
 *
 * `planSeedRepair` is pure: it returns which records to delete and which to (re)write. A password
 * that a person chose themselves is always kept; only the old built-in defaults are replaced.
 */
import { UserProfile } from '../types';
import { DEFAULT_STAFF_PASSWORD_HASH, DEFAULT_ADMIN_PASSWORD_HASH } from './crypto';

/** Hashes of the retired built-in demo passwords. Never treated as "chosen by the user". */
export const LEGACY_DEFAULT_HASHES: ReadonlySet<string> = new Set([
  DEFAULT_STAFF_PASSWORD_HASH,
  DEFAULT_ADMIN_PASSWORD_HASH,
]);

/**
 * Staff IDs of demo staff that no longer exist in the seed (HR directory trimmed to the people the
 * demo needs). Old records for these IDs are removed — but only if they were created before the
 * cut-off below, so accounts created later through the staff-approval flow are never touched.
 */
export const RETIRED_DEMO_STAFF_IDS: ReadonlySet<string> = new Set([
  '2016000209', // Dr. Lourdes M. Garcia
  '2017000331', // Dr. Carmela R. Alvarez (old demo account; she remains an HR record for the registration demo)
  '2020001045', // Dr. Vicente G. Torres
  '2022003120', // Ms. Angelica P. Robles
  '2023004488', // Engr. Miguel A. Serrano
  '2021002011', // Ms. Marie S. Valdez (Document Verifier role merged into Evaluator)
]);
const RETIRED_CUTOFF = '2026-01-01T00:00:00Z';

/**
 * The first demo build stored its staff under these ids WITHOUT a staff ID number, so they cannot be
 * matched by staff ID. They are matched by exact id + old demo email + old creation date instead.
 */
const LEGACY_DEMO_USERS: Record<string, string> = {
  'usr-staff-002': 'danilo.ramos@meridian.edu',
  'usr-staff-003': 'carmela.alvarez@meridian.edu',
  'usr-staff-004': 'benedict.luna@meridian.edu',
  'usr-staff-005': 'lourdes.garcia@meridian.edu',
};

export interface SeedRepairPlan {
  deleteIds: string[];
  writes: UserProfile[];
}

const isDefaultOrBlank = (pw?: string) => !pw || LEGACY_DEFAULT_HASHES.has(pw);

export function planSeedRepair(existing: UserProfile[], seeded: UserProfile[]): SeedRepairPlan {
  const deleteIds: string[] = [];
  const writes: UserProfile[] = [];
  const seededIds = new Set(seeded.map((a) => a.id));

  // Retired demo staff (old build): remove.
  for (const u of existing) {
    if (seededIds.has(u.id)) continue;
    if (LEGACY_DEMO_USERS[u.id] === (u.email || '').trim().toLowerCase() && (u.created_at || '') < RETIRED_CUTOFF) {
      deleteIds.push(u.id);
      continue;
    }
    if (u.university_id && RETIRED_DEMO_STAFF_IDS.has(u.university_id) && (u.created_at || '') < RETIRED_CUTOFF) {
      deleteIds.push(u.id);
    }
  }

  for (const acc of seeded) {
    const email = acc.email.trim().toLowerCase();
    const current = existing.find((u) => u.id === acc.id);
    // Same person under another id: same email OR same staff/student number.
    const duplicates = existing.filter(
      (u) =>
        u.id !== acc.id &&
        ((u.email || '').trim().toLowerCase() === email || (!!acc.university_id && u.university_id === acc.university_id))
    );
    duplicates.forEach((u) => deleteIds.push(u.id));

    // A password the person set themselves (on this record or on a stale duplicate of it).
    const chosen = [current, ...duplicates].find((u) => u && !isDefaultOrBlank(u.password) && u.password !== acc.password)?.password;

    if (current && !isDefaultOrBlank(current.password)) {
      // Keep their profile and password; only make sure the role is current.
      if (duplicates.length > 0 || current.role !== acc.role || current.staff_role !== acc.staff_role) {
        writes.push({ ...current, role: acc.role, staff_role: acc.staff_role });
      }
    } else {
      // Missing, or still on a retired default password → write the current seed.
      writes.push({ ...acc, password: chosen ?? acc.password });
    }
  }
  return { deleteIds, writes };
}

/** Applies a plan to an in-memory list (used for the offline localStorage cache). */
export function applySeedRepair(users: UserProfile[], plan: SeedRepairPlan): UserProfile[] {
  const drop = new Set(plan.deleteIds);
  const byId = new Map(plan.writes.map((w) => [w.id, w]));
  const kept = users.filter((u) => !drop.has(u.id)).map((u) => byId.get(u.id) ?? u);
  for (const w of plan.writes) if (!kept.some((u) => u.id === w.id)) kept.push(w);
  return kept;
}
