/**
 * Application Audit Trail
 *
 * An audit trail answers: "who did what to which application, and when?" It records only
 * decisions and changes to applications (submitted, documents verified, shortlisted, endorsed,
 * approved, rejected, scholar status changed...). It deliberately has no IP address, device,
 * location or severity — those belong to the System Administrator's Security & Access Logs.
 *
 * Entries come from the shared `audit_logs` collection. New entries carry structured fields
 * (app_ref, from_status, to_status...). Older entries only have a sentence, so `toAuditRow`
 * also understands the old wording.
 */
import { LogEntry } from './logger';
import { UserProfile, normalizeRole } from '../types';

export type AuditActionKey =
  | 'submitted'
  | 'verified'
  | 'in_review'
  | 'shortlisted'
  | 'endorsed'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'scholar_status'
  | 'status_changed'
  | 'interview'
  | 'interview_done'
  | 'updated'
  | 'deleted';

export const AUDIT_ACTIONS: Record<AuditActionKey, { label: string; tone: 'slate' | 'sky' | 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber' }> = {
  submitted: { label: 'Application submitted', tone: 'slate' },
  verified: { label: 'Documents verified', tone: 'sky' },
  in_review: { label: 'Review started', tone: 'sky' },
  shortlisted: { label: 'Shortlisted for interview', tone: 'indigo' },
  endorsed: { label: 'Endorsed for final approval', tone: 'violet' },
  approved: { label: 'Approved', tone: 'emerald' },
  rejected: { label: 'Rejected', tone: 'rose' },
  returned: { label: 'Returned to pending', tone: 'slate' },
  scholar_status: { label: 'Scholar status changed', tone: 'amber' },
  status_changed: { label: 'Status changed', tone: 'slate' },
  interview: { label: 'Interview scheduled', tone: 'indigo' },
  interview_done: { label: 'Interview completed', tone: 'violet' },
  updated: { label: 'Remarks / notes updated', tone: 'slate' },
  deleted: { label: 'Application deleted', tone: 'rose' },
};

const STATUS_TO_ACTION: Record<string, AuditActionKey> = {
  'In Review': 'in_review',
  Shortlisted: 'shortlisted',
  'For Approval': 'endorsed',
  Approved: 'approved',
  Rejected: 'rejected',
  Pending: 'returned',
  Removed: 'scholar_status',
  Expired: 'scholar_status',
  'For Renewal': 'scholar_status',
};

export interface AuditRow {
  id: string;
  timestamp: string;
  ref: string;
  student: string;
  scholarship?: string;
  action: AuditActionKey;
  from?: string;
  to?: string;
  actor: string;
  actorLabel: string;
  detail?: string;
}

/** Role label recorded next to every audit entry. */
export function actorLabelFor(user: Pick<UserProfile, 'role' | 'staff_role'>): string {
  const role = normalizeRole(user.role);
  if (role === 'coordinator') return 'Scholarship Coordinator';
  if (role === 'system_admin') return 'System Administrator';
  if (role === 'student') return 'Student';
  if (user.staff_role === 'evaluator' || user.staff_role === 'document_verifier') return 'Staff Evaluator';
  if (user.staff_role === 'interviewer') return 'Staff Interviewer';
  return 'Staff';
}

const legacyActorLabel = (role?: string): string => {
  switch (role) {
    case 'coordinator':
    case 'admin':
      return 'Scholarship Coordinator';
    case 'system_admin':
      return 'System Administrator';
    case 'staff':
      return 'Staff';
    case 'student':
      return 'Student';
    case 'system':
      return 'System';
    default:
      return '';
  }
};

interface Parsed {
  ref: string;
  student: string;
  scholarship?: string;
  action: AuditActionKey;
  from?: string;
  to?: string;
  detail?: string;
}

/** Reads an entry written before structured fields existed. */
function parseLegacy(message: string): Parsed | null {
  let m = message.match(/^New application submitted: (\S+) — (.+?) for "(.+)"$/);
  if (m) return { ref: m[1], student: m[2], scholarship: m[3], action: 'submitted' };

  m = message.match(/^(\S+) \((.+?)\): status changed from "(.*?)" to "(.*?)"(?: — (.*))?$/);
  if (m) return { ref: m[1], student: m[2], from: m[3], to: m[4], action: STATUS_TO_ACTION[m[4]] || 'status_changed', detail: m[5] };

  m = message.match(/^(\S+) \((.+?)\): review details updated$/);
  if (m) return { ref: m[1], student: m[2], action: 'updated' };

  m = message.match(/^Application deleted: (\S+) — (.+)$/);
  if (m) return { ref: m[1], student: m[2], action: 'deleted' };

  m = message.match(/^Automated Status Routing: Application (\S+) \((.+?)\) automatically routed to "(.*?)"$/);
  if (m) return { ref: m[1], student: m[2], to: m[3], action: STATUS_TO_ACTION[m[3]] || 'status_changed', detail: 'Grant term ended (automatic)' };

  return null; // drafts, sign-ins, programs, etc. are not part of the application audit trail
}

/** Returns the audit row for a log entry, or null when the entry is not an application event. */
export function toAuditRow(e: LogEntry): AuditRow | null {
  if (e.action === 'application.draft') return null; // an unsaved working copy is not a decision

  let p: Parsed | null = null;
  if (e.app_ref) {
    const act = e.action || '';
    const action: AuditActionKey =
      act === 'application.submitted' ? 'submitted'
      : act === 'application.verify' ? 'verified'
      : act === 'application.interview_done' ? 'interview_done'
      : act === 'application.interview' ? 'interview'
      : act === 'application.update' ? 'updated'
      : act === 'application.deleted' ? 'deleted'
      : (e.to_status && STATUS_TO_ACTION[e.to_status]) || 'status_changed';
    p = { ref: e.app_ref, student: e.student_name || '', scholarship: e.scholarship, action, from: e.from_status, to: e.to_status, detail: e.detail };
  } else if (e.category === 'Application' || e.category === 'Lifecycle') {
    p = parseLegacy(e.message || '');
  }
  if (!p) return null;

  return {
    id: e.id,
    timestamp: e.timestamp,
    ref: p.ref,
    student: p.student,
    scholarship: p.scholarship,
    action: p.action,
    from: p.from,
    to: p.to,
    actor: e.actor_name || 'Unknown',
    actorLabel: e.actor_label || legacyActorLabel(e.actor_role),
    detail: p.detail,
  };
}

export function toAuditRows(logs: LogEntry[]): AuditRow[] {
  return logs
    .map(toAuditRow)
    .filter((r): r is AuditRow => r !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function auditRowsToCSV(rows: AuditRow[]): string {
  const q = (v: string | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Date & Time', 'Application No.', 'Student', 'Scholarship', 'Action', 'From', 'To', 'Performed By', 'Role', 'Details'];
  const body = rows.map((r) =>
    [new Date(r.timestamp).toLocaleString('en-PH'), r.ref, r.student, r.scholarship, AUDIT_ACTIONS[r.action].label, r.from, r.to, r.actor, r.actorLabel, r.detail].map(q).join(',')
  );
  return [head.map(q).join(','), ...body].join('\n');
}
