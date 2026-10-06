import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Award, FileText, ChevronDown, Clock, FilePlus2, RefreshCw, Eye } from 'lucide-react';
import { Application, ApplicationDocument, ApplicationStatus, Scholarship } from '../../types';
import { DocumentViewerModal } from '../common/DocumentViewerModal';

interface StatusTrackerProps {
  applications: Application[]; // already limited to the signed-in student
  scholarships: Scholarship[];
  highlightRef?: string;
  onStartApplication?: () => void;
}

const PIPELINE: { status: ApplicationStatus; label: string; help: string }[] = [
  { status: 'In Review', label: 'In review', help: 'Staff are checking your documents.' },
  { status: 'Shortlisted', label: 'For interview', help: 'Your documents are verified. You will be interviewed at the time shown in your message.' },
  { status: 'For Approval', label: 'Final approval', help: 'Recommended by staff. The Scholarship Coordinator gives the final decision.' },
  { status: 'Approved', label: 'Awarded', help: 'Your grant is approved for the semester shown.' },
];

const BADGE: Record<ApplicationStatus, string> = {
  Pending: 'bg-slate-600',
  'In Review': 'bg-sky-600',
  Shortlisted: 'bg-indigo-600',
  'For Approval': 'bg-violet-600',
  Approved: 'bg-emerald-600',
  Rejected: 'bg-rose-600',
  'For Renewal': 'bg-amber-600',
  Expired: 'bg-orange-600',
  Removed: 'bg-red-700',
};

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const StatusTracker: React.FC<StatusTrackerProps> = ({ applications, highlightRef, onStartApplication }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ doc: ApplicationDocument; app: Application } | null>(null);

  useEffect(() => {
    const target = applications.find((a) => a.reference_code === highlightRef) || applications[0];
    setOpenId(target ? target.id : null);
  }, [highlightRef, applications.length]);

  if (applications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
        <FilePlus2 className="w-10 h-10 text-indigo-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">You have not applied for a scholarship yet</h2>
        <p className="text-xs text-slate-500">Scholarships open to your program are listed under New Application.</p>
        {onStartApplication && (
          <button type="button" onClick={onStartApplication} className="text-xs font-bold px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl cursor-pointer">
            See scholarships for my program
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {applications.map((app) => {
        const open = openId === app.id;
        const stepIdx = PIPELINE.findIndex((p) => p.status === (app.status === 'Pending' ? 'In Review' : app.status));
        const ended = ['Rejected', 'Removed', 'Expired', 'For Renewal'].includes(app.status);
        return (
          <section key={app.id} className={`bg-white rounded-2xl border shadow-xs overflow-hidden ${app.reference_code === highlightRef ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : app.id)}
              aria-expanded={open}
              className="w-full text-left p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50"
            >
              <div>
                <p className="text-[11px] font-mono text-slate-500">
                  {app.reference_code} · Submitted {fmt(app.created_at)}
                  {app.is_renewal && <span className="ml-2 inline-flex items-center gap-1 text-emerald-700 font-sans font-bold"><RefreshCw className="w-3 h-3" />Renewal</span>}
                </p>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{app.scholarship_title}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-[11px] font-bold text-white ${BADGE[app.status]}`}>{app.status === 'For Approval' ? 'Awaiting final approval' : app.status === 'Shortlisted' ? 'For interview' : app.status === 'Pending' ? 'In Review' : app.status}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {open && (
              <div className="border-t border-slate-100 p-5 space-y-5 text-xs">
                {ended ? (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${app.status === 'Rejected' || app.status === 'Removed' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                    <XCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-bold">
                        {app.status === 'Rejected' ? 'Not selected' : app.status === 'Removed' ? 'Grant removed' : app.status === 'Expired' ? 'Grant period has ended' : 'Renewal is open'}
                      </p>
                      <p className="mt-0.5">{app.removal_reason || app.remarks}</p>
                    </div>
                  </div>
                ) : (
                  <ol className="grid grid-cols-5 gap-2" aria-label="Application progress">
                    {PIPELINE.map((p, i) => {
                      const done = i <= stepIdx;
                      const current = i === stepIdx;
                      return (
                        <li key={p.status} className="flex flex-col items-center text-center gap-1.5">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${done ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-slate-300 text-slate-400'} ${current ? 'ring-4 ring-indigo-100' : ''}`}>
                            {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                          </span>
                          <span className={`text-[11px] font-bold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{p.label}</span>
                          {current && <span className="text-[10px] text-slate-500 hidden sm:block">{p.help}</span>}
                        </li>
                      );
                    })}
                  </ol>
                )}

                {app.status === 'Approved' && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Award className="w-8 h-8 text-emerald-600" />
                      <div>
                        <p className="font-bold text-emerald-900">₱{app.awarded_amount.toLocaleString()} awarded</p>
                        <p className="text-emerald-800">Covers {app.grant_term || 'the current semester'} · valid until {fmt(app.expires_at)}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-800 sm:max-w-[220px]">The Accounting Office credits the grant to your student account. ScholarFlow does not release funds.</p>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 mb-1">Message from the scholarship office</p>
                  <p className="text-slate-800 leading-relaxed">{app.remarks || 'No message yet.'}</p>
                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1"><Clock className="w-3 h-3" />Last updated {fmt(app.updated_at)}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-500 mb-1.5">Documents you submitted ({app.documents.length})</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {app.documents.map((d) => (
                      // Always clickable: if the doc has real file data it shows that;
                      // if it is a seeded record the viewer auto-generates an official sample PDF.
                      <li key={d.id}
                        className="flex items-start gap-2 bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-lg p-2 transition-colors cursor-pointer group"
                        onClick={() => setPreviewDoc({ doc: d, app })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setPreviewDoc({ doc: d, app })}
                        title={`View ${d.label || d.name}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <span className="flex-1 min-w-0">
                          <span className="font-semibold text-slate-800 block leading-tight">{d.label || d.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 truncate block">{d.name}</span>
                        </span>
                        <Eye className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1"><Eye className="w-3 h-3" />Click any document to view or download it.</p>
                </div>
              </div>
            )}
          </section>
        );
      })}
      {previewDoc && (
        <DocumentViewerModal
          document={previewDoc.doc}
          studentName={`${previewDoc.app.first_name} ${previewDoc.app.last_name}`}
          studentNumber={previewDoc.app.student_number}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};
