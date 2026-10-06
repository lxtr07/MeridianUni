import React, { useMemo, useState } from 'react';
import { ArrowRight, FileText, Search, ScrollText, X } from 'lucide-react';
import { LogEntry } from '../../lib/logger';
import { AUDIT_ACTIONS, AuditActionKey, auditRowsToCSV, toAuditRows } from '../../lib/auditTrail';
import { StandardPagination } from '../common/StandardPagination';

const TONES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  sky: 'bg-sky-50 text-sky-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  violet: 'bg-violet-50 text-violet-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
  amber: 'bg-amber-50 text-amber-700',
};

/**
 * Application Audit Trail (Scholarship Coordinator).
 * A record of who did what to which application, and when. No IP, device, location or severity —
 * those live in the System Administrator's Security & Access Logs.
 */
export const ApplicationAuditTrail: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<'all' | AuditActionKey>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const rows = useMemo(() => toAuditRows(logs), [logs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (action !== 'all' && r.action !== action) return false;
      if (!q) return true;
      return [r.ref, r.student, r.scholarship, r.actor, r.actorLabel, r.detail, AUDIT_ACTIONS[r.action].label]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [rows, search, action]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);

  const exportCsv = () => {
    const blob = new Blob([auditRowsToCSV(filtered)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Audit Trail</span>
            <span className="text-xs text-slate-500 font-medium">Meridian University</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Application Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            A permanent record of who did what to each application: submission, verification, endorsement, approval, rejection and status changes.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search application no., student or staff name..."
            aria-label="Search audit trail"
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value as 'all' | AuditActionKey); setPage(1); }}
          aria-label="Filter by action"
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All actions</option>
          {(Object.keys(AUDIT_ACTIONS) as AuditActionKey[]).map((k) => (
            <option key={k} value={k}>{AUDIT_ACTIONS[k].label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3 text-left font-bold text-slate-600 whitespace-nowrap">Date &amp; Time</th>
                <th className="p-3 text-left font-bold text-slate-600">Application</th>
                <th className="p-3 text-left font-bold text-slate-600">Action</th>
                <th className="p-3 text-left font-bold text-slate-600 whitespace-nowrap">Status change</th>
                <th className="p-3 text-left font-bold text-slate-600">Performed by</th>
                <th className="p-3 text-left font-bold text-slate-600 min-w-[180px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <ScrollText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">
                      {rows.length === 0 ? 'No application activity recorded yet' : 'No entries match your search'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {rows.length === 0
                        ? 'Entries appear here as applications are submitted, verified, endorsed, approved or rejected.'
                        : 'Try a different search or action.'}
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const d = new Date(r.timestamp);
                  const meta = AUDIT_ACTIONS[r.action];
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="p-3 whitespace-nowrap font-medium text-slate-700">
                        <div>{d.toLocaleDateString('en-CA')}</div>
                        <div className="text-slate-400">{d.toLocaleTimeString('en-GB')}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono font-semibold text-slate-800">{r.ref}</div>
                        <div className="text-slate-600">{r.student || '—'}</div>
                        {r.scholarship && <div className="text-slate-400">{r.scholarship}</div>}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${TONES[meta.tone]}`}>{meta.label}</span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {r.from || r.to ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span>{r.from || '—'}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-slate-800">{r.to || '—'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{r.actor}</div>
                        <div className="text-slate-400">{r.actorLabel}</div>
                      </td>
                      <td className="p-3 text-slate-600 break-words">{r.detail || <span className="text-slate-300">—</span>}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <StandardPagination
            currentPage={current}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            pageSizeOptions={[12, 24, 48]}
            itemLabel="entries"
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            className="px-4 py-3 border-t border-slate-100"
          />
        )}
      </div>
    </div>
  );
};
