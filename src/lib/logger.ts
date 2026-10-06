/**
 * ScholarFlow — Audit & Access Logger
 *
 * Every visit, sign-in (successful or failed), sign-out and data change is written to the
 * `audit_logs` collection in Cloud Firestore with the date, time, actor, role, IP address and
 * approximate location (country / city), so administrators can see who accessed the portal,
 * from where, and what they did.
 *
 * Location comes from a public IP-geolocation service. If it cannot be reached, the entry is
 * still written and the location falls back to the browser's time zone.
 */

export type LogSeverity = 'Info' | 'Warning' | 'Security' | 'System';
export type ActorRole = 'student' | 'staff' | 'coordinator' | 'system_admin' | 'admin' | 'visitor' | 'system';

/**
 * Each log category falls into one of two logical streams:
 *
 *   - 'scholarship' : actions in the scholarship audit trail (viewed by the Scholarship Coordinator)
 *   - 'security'    : technical / security events (viewed by the System Administrator)
 *
 * This split is purely a view-side filter — the underlying `audit_logs` collection stores
 * every entry with its `category` field, so no schema change is required.
 */
export type LogStream = 'scholarship' | 'security';

const SCHOLARSHIP_CATEGORIES = new Set(['Application', 'Scholarship', 'Freeze', 'Interview']);
const SECURITY_CATEGORIES = new Set(['Authentication', 'Visit', 'Account', 'Session', 'Password', 'Device']);

export function logStreamFor(category?: string): LogStream {
  if (!category) return 'security';
  if (SCHOLARSHIP_CATEGORIES.has(category)) return 'scholarship';
  if (SECURITY_CATEGORIES.has(category)) return 'security';
  // Default anything unknown to security — safer for audit purposes.
  return 'security';
}

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string
  severity: LogSeverity;
  category: string; // Visit, Authentication, Application, Scholarship, Account, Freeze, ...
  action?: string; // short machine-friendly action, e.g. "login.success"
  message: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: ActorRole;
  /** Human-readable role shown in the audit trail, e.g. "Staff Evaluator". */
  actor_label?: string;
  // --- Structured application-audit fields (only set on application events) ---
  /** Application reference code, e.g. MU-1BMQQ32P. */
  app_ref?: string;
  student_name?: string;
  scholarship?: string;
  from_status?: string;
  to_status?: string;
  /** Extra context: award amount/term, rejection reason, "3 of 4 documents verified"... */
  detail?: string;
  ip?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  device?: string;
  browser?: string;
  page?: string;
  session_id?: string;
}

interface Actor {
  id: string;
  name: string;
  role: ActorRole;
  label?: string;
}

/** Structured facts recorded on application events so the audit trail does not have to parse text. */
export type AuditMeta = Partial<Pick<LogEntry, 'app_ref' | 'student_name' | 'scholarship' | 'from_status' | 'to_status' | 'detail'>>;

interface GeoInfo {
  ip?: string;
  country?: string;
  city?: string;
  region?: string;
}

const LOCAL_KEY = 'scholarflow_local_logs';
const SESSION_KEY = 'scholarflow_log_session';
const GEO_KEY = 'scholarflow_geo_v1';
const MAX_LOCAL = 300;

let currentActor: Actor | null = null;
let geoPromise: Promise<GeoInfo> | null = null;
let remoteWriter: ((e: LogEntry) => Promise<void>) | null = null;
let remoteFailed = false;

/** Called once from App so this module does not import Firebase directly (avoids an import cycle). */
export function registerLogWriter(writer: (e: LogEntry) => Promise<void>): void {
  remoteWriter = writer;
}

export function setLogActor(actor: { id: string; full_name: string; role: ActorRole; label?: string } | null): void {
  currentActor = actor ? { id: actor.id, name: actor.full_name, role: actor.role, label: actor.label } : null;
}

export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `ses-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'ses-unknown';
  }
}

function describeDevice(): { device: string; browser: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const device = /Mobi|Android|iPhone/i.test(ua) ? 'Mobile' : /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Desktop';
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)
    ? 'macOS'
    : /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad/i.test(ua)
    ? 'iOS'
    : /Linux/i.test(ua)
    ? 'Linux'
    : 'Unknown OS';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
    ? 'Opera'
    : /Chrome\//.test(ua)
    ? 'Chrome'
    : /Firefox\//.test(ua)
    ? 'Firefox'
    : /Safari\//.test(ua)
    ? 'Safari'
    : 'Other';
  return { device: `${device} · ${os}`, browser };
}

async function fetchWithTimeout(url: string, ms = 4000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function lookupGeo(): Promise<GeoInfo> {
  if (geoPromise) return geoPromise;
  geoPromise = (async () => {
    try {
      const cached = sessionStorage.getItem(GEO_KEY);
      if (cached) return JSON.parse(cached) as GeoInfo;
    } catch {
      // ignore
    }
    let geo: GeoInfo = {};
    try {
      const r = await fetchWithTimeout('https://ipapi.co/json/');
      if (r.ok) {
        const j = await r.json();
        if (!j.error) geo = { ip: j.ip, country: j.country_name, city: j.city, region: j.region };
      }
    } catch {
      // try the next provider
    }
    if (!geo.country) {
      try {
        const r = await fetchWithTimeout('https://ipwho.is/');
        if (r.ok) {
          const j = await r.json();
          if (j.success !== false) geo = { ip: j.ip, country: j.country, city: j.city, region: j.region };
        }
      } catch {
        // fall through to time-zone estimate
      }
    }
    try {
      if (geo.country) sessionStorage.setItem(GEO_KEY, JSON.stringify(geo));
    } catch {
      // ignore
    }
    return geo;
  })();
  return geoPromise;
}

function readLocal(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(entry: LogEntry): void {
  try {
    const logs = readLocal();
    logs.unshift(entry);
    if (logs.length > MAX_LOCAL) logs.splice(MAX_LOCAL);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(logs));
  } catch {
    // ignore quota errors
  }
}

/**
 * Record an audit entry. Fire-and-forget: never throws and never blocks the UI.
 * `options.actor` overrides the signed-in user (used for failed logins and sign-outs).
 */
export function logEvent(
  severity: LogSeverity,
  category: string,
  message: string,
  options: { action?: string; actor?: { id: string; name: string; role: ActorRole; label?: string } | null; audit?: AuditMeta } = {}
): void {
  const actor = options.actor !== undefined ? options.actor : currentActor;
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  })();
  const { device, browser } = describeDevice();

  const base: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    severity,
    category,
    action: options.action,
    message,
    actor_id: actor?.id,
    actor_name: actor?.name || 'Anonymous visitor',
    actor_role: actor?.role || 'visitor',
    actor_label: actor?.label,
    ...(options.audit || {}),
    timezone: tz,
    device,
    browser,
    page: typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined,
    session_id: getSessionId(),
  };

  lookupGeo()
    .then((geo) => {
      const entry: LogEntry = {
        ...base,
        ip: geo.ip,
        country: geo.country || (tz ? `Unknown (time zone ${tz})` : 'Unknown'),
        city: geo.city,
        region: geo.region,
      };
      writeLocal(entry);
      if (remoteWriter && !remoteFailed) {
        remoteWriter(entry).catch((err) => {
          // Most likely the audit_logs rule has not been published yet. Keep logging locally.
          console.warn('Audit log could not be saved to Firestore (check firestore.rules for audit_logs):', err);
          remoteFailed = true;
          setTimeout(() => (remoteFailed = false), 60000);
        });
      }
    })
    .catch(() => writeLocal(base));
}

/** Records one "visit" per browser session per page view name. */
export function logVisit(view: string): void {
  try {
    const key = `scholarflow_visit_${view}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // ignore
  }
  logEvent('Info', 'Visit', `Opened the ${view} page`, { action: 'visit' });
}

/** Local copy of recent entries (used when Firestore logs are unavailable). */
export function getLogs(): LogEntry[] {
  return readLocal();
}

export function clearLogs(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ignore
  }
}

export function logsToCSV(logs: LogEntry[]): string {
  const header = ['Date', 'Time', 'Severity', 'Category', 'Action', 'User', 'Role', 'IP Address', 'Country', 'City', 'Device', 'Browser', 'Message'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = logs.map((l) => {
    const d = new Date(l.timestamp);
    return [
      d.toLocaleDateString('en-CA'),
      d.toLocaleTimeString('en-GB'),
      l.severity,
      l.category,
      l.action || '',
      l.actor_name || '',
      l.actor_role || '',
      l.ip || '',
      l.country || '',
      l.city || '',
      l.device || '',
      l.browser || '',
      l.message,
    ]
      .map(esc)
      .join(',');
  });
  return [header.map(esc).join(','), ...rows].join('\n');
}

/** Kept for older callers. */
export function exportLogsAsCSV(): string {
  return logsToCSV(readLocal());
}
