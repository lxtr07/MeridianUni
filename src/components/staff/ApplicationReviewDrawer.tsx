import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X, CheckCircle2, FileText, Award, Eye, Trash2, AlertTriangle, RefreshCw, Clock, ShieldAlert, Calendar,
  Save, AlertCircle, Circle, Info,
} from 'lucide-react';
import { Application, ApplicationStatus, ApplicationDocument, Scholarship, InterviewSchedule, UserProfile } from '../../types';
import { DocumentViewerModal } from '../common/DocumentViewerModal';
import { buildDocumentChecklist, screeningQuestionsFor, memberAnnualIncome, memberEarns } from '../../lib/scholarshipRules';
import { getAwardTerm, formatTermRange, GWA_SCALE_NOTE } from '../../data/universityRegistry';

interface ApplicationReviewDrawerProps {
  application: Application;
  scholarships?: Scholarship[];
  currentUser?: UserProfile;
  onClose: () => void;
  onUpdateApplication: (updatedApp: Application) => void | Promise<void>;
  onDeleteApplication?: (id: string) => void;
  onSaveInterview?: (interview: InterviewSchedule) => void;
}

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Pending: 'bg-slate-200 text-slate-800',
  'In Review': 'bg-sky-100 text-sky-800',
  Shortlisted: 'bg-indigo-100 text-indigo-800',
  'For Approval': 'bg-violet-100 text-violet-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-rose-100 text-rose-800',
  'For Renewal': 'bg-amber-100 text-amber-800',
  Expired: 'bg-orange-100 text-orange-800',
  Removed: 'bg-red-100 text-red-900',
};

/** Button text says exactly what will happen. */
const ACTION_LABEL: Record<string, string> = {
  Pending: 'Return to pending queue',
  'In Review': 'Mark as in review',
  Shortlisted: 'Shortlist for interview',
  'For Approval': 'Endorse for final approval',
  Approved: 'Approve and award grant',
  Rejected: 'Reject application',
  Removed: 'Remove scholar from program',
};

const peso = (n: number) => `₱${n.toLocaleString()}`;
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export const ApplicationReviewDrawer: React.FC<ApplicationReviewDrawerProps> = ({
  application,
  scholarships = [],
  currentUser,
  onClose,
  onUpdateApplication,
  onDeleteApplication,
  onSaveInterview,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const scholarship = scholarships.find((s) => s.id === application.scholarship_id);
  const draft = application.review_draft;

  const [status, setStatus] = useState<ApplicationStatus>(draft?.status || application.status);
  const [awardedAmount, setAwardedAmount] = useState<number | ''>(draft?.awarded_amount || application.awarded_amount || scholarship?.grant_amount || '');
  const [remarks, setRemarks] = useState(draft?.remarks ?? application.remarks ?? '');
  const [staffNotes, setStaffNotes] = useState(draft?.staff_notes ?? application.staff_notes ?? '');
  const [removalReason, setRemovalReason] = useState(application.removal_reason || '');
  const [verified, setVerified] = useState<Set<string>>(
    new Set(draft?.verified_document_ids || application.documents.filter((d) => d.verified).map((d) => d.id))
  );
  const [inspectDoc, setInspectDoc] = useState<ApplicationDocument | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(draft ? `Draft restored — saved by ${draft.saved_by} on ${fmt(draft.saved_at)}.` : null);
  const [saving, setSaving] = useState(false);

  const [interviewDateTime, setInterviewDateTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('Office of Student Financial Assistance, Room 204');
  const [interviewerName, setInterviewerName] = useState(currentUser?.full_name || '');

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (inspectDoc) setInspectDoc(null);
      else if (confirmDelete) setConfirmDelete(false);
      else onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [inspectDoc, confirmDelete, onClose]);

  // Grant validity is automatic: one regular semester from the academic calendar.
  const awardTerm = useMemo(() => getAwardTerm(new Date()), []);
  const minGrant = scholarship?.min_grant_amount || 0;
  const maxGrant = scholarship?.grant_amount || 0;
  const amountMatters = status === 'Approved' || status === 'For Approval';

  // Requirement checklist vs what was uploaded
  const checklist = useMemo(() => {
    if (!scholarship) return [];
    return buildDocumentChecklist(scholarship, application.household_members || [], {
      isWorkingStudent: Boolean(application.is_working_student),
      annualFamilyIncome: application.annual_family_income ?? application.monthly_family_income * 12,
      answers: application.screening_answers || {},
    });
  }, [scholarship, application]);

  const docFor = (label: string, code: string): ApplicationDocument | undefined =>
    application.documents.find((d) => d.label === label) || application.documents.find((d) => d.requirement_code === code);
  const matchedIds = new Set(checklist.map((c) => docFor(c.label, c.code)?.id).filter(Boolean) as string[]);
  const extraDocs = application.documents.filter((d) => !matchedIds.has(d.id));
  const missingCount = checklist.filter((c) => !docFor(c.label, c.code)).length;

  const statusOptions: { value: ApplicationStatus; label: string }[] = [
    { value: 'Pending', label: 'Pending — not yet reviewed' },
    { value: 'In Review', label: 'In review — checking documents' },
    { value: 'Shortlisted', label: 'Shortlisted — invite to interview' },
    { value: 'For Approval', label: 'Endorse for approval (admin decides)' },
    ...(isAdmin ? [{ value: 'Approved' as ApplicationStatus, label: 'Approved — award the grant' }] : []),
    { value: 'Rejected', label: 'Rejected — not selected' },
    ...(['Approved', 'Removed'].includes(application.status) ? [{ value: 'Removed' as ApplicationStatus, label: 'Removed — policy failure' }] : []),
  ];

  const validate = (): string | null => {
    if (status === 'Approved' && !isAdmin) return 'Only a System Administrator can approve. Choose "Endorse for approval" instead.';
    if (amountMatters) {
      const amt = Number(awardedAmount) || 0;
      if (amt < minGrant) return `The grant must be at least ${peso(minGrant)} per semester for this scholarship.`;
      if (amt > maxGrant) return `The grant cannot exceed ${peso(maxGrant)} per semester for this scholarship.`;
    }
    if ((status === 'For Approval' || status === 'Approved') && missingCount > 0) return `${missingCount} required document${missingCount === 1 ? ' is' : 's are'} missing. The applicant cannot be endorsed or approved until every document is on file.`;
    if ((status === 'For Approval' || status === 'Approved') && verified.size < application.documents.length) return 'Tick "Verified" on every submitted document before endorsing or approving.';
    if (status === 'Rejected' && !remarks.trim()) return 'Explain to the student why the application was not selected (student-visible message).';
    if (status === 'Removed' && !removalReason.trim()) return 'Enter the reason for removing this scholar.';
    if (status === 'Shortlisted' && interviewDateTime && new Date(interviewDateTime) < new Date()) return 'The interview must be scheduled in the future.';
    return null;
  };

  const handleSaveDraft = async () => {
    setError(null);
    setSaving(true);
    try {
      await onUpdateApplication({
        ...application,
        review_draft: {
          status,
          awarded_amount: Number(awardedAmount) || 0,
          remarks,
          staff_notes: staffNotes,
          verified_document_ids: Array.from(verified),
          saved_by: currentUser?.full_name || 'Staff',
          saved_at: new Date().toISOString(),
        },
        updated_at: application.updated_at,
      });
      setNotice(`Draft saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. The student will not see it until you submit the decision.`);
    } catch (err: any) {
      setError(err?.message || 'The draft could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const problem = validate();
    setError(problem);
    if (problem) return;

    const now = new Date().toISOString();
    const updated: Application = {
      ...application,
      status,
      awarded_amount: amountMatters ? Number(awardedAmount) || 0 : status === 'Rejected' ? 0 : application.awarded_amount,
      remarks: remarks.trim(),
      staff_notes: staffNotes.trim(),
      removal_reason: status === 'Removed' ? removalReason.trim() : application.removal_reason,
      documents: application.documents.map((d) => ({ ...d, verified: verified.has(d.id) })),
      review_draft: null as any, // clears any saved draft in Firestore
      updated_at: now,
    };

    if (status === 'For Approval' && application.status !== 'For Approval') {
      updated.endorsed_by = currentUser?.full_name;
      updated.endorsed_at = now;
    }
    if (status === 'Approved' && application.status !== 'Approved') {
      updated.approved_at = now;
      updated.approved_by = `${currentUser?.full_name} (Administrator)`;
      updated.approved_by_id = currentUser?.id;
      updated.grant_term = awardTerm.label;
      updated.expires_at = new Date(awardTerm.end + 'T23:59:59').toISOString();
    }

    setSaving(true);
    try {
      if (status === 'Shortlisted' && onSaveInterview) {
        const dt = interviewDateTime ? new Date(interviewDateTime) : null;
        onSaveInterview({
          id: `inv-${Date.now()}`,
          application_id: application.id,
          student_name: `${application.first_name} ${application.last_name} (${application.student_number})`,
          scholarship_title: application.scholarship_title,
          date_time: dt ? dt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'To be scheduled',
          location: interviewLocation.trim() || 'Office of Student Financial Assistance',
          interviewer: interviewerName.trim() || currentUser?.full_name || 'Scholarship staff',
          status: 'Scheduled',
        });
      }
      await onUpdateApplication(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'The decision could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const toggleVerified = (id: string) =>
    setVerified((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const docRow = (label: string, doc: ApplicationDocument | undefined, why?: string) => (
    <div key={label} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${doc ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200'}`}>
      <div className="flex items-start gap-2.5 min-w-0">
        {doc ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <p className="font-bold text-slate-800">{label}</p>
          {why && <p className="text-[10px] text-slate-500">{why}</p>}
          <p className="text-[10px] font-mono text-slate-500 truncate">{doc ? `${doc.name} · ${doc.size}` : 'Not submitted'}</p>
        </div>
      </div>
      {doc && (
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={verified.has(doc.id)} onChange={() => toggleVerified(doc.id)} />
            Verified
          </label>
          <button type="button" onClick={() => setInspectDoc(doc)} className="flex items-center gap-1 font-bold text-indigo-600 bg-white border border-slate-200 hover:bg-indigo-50 px-2.5 py-1 rounded-lg cursor-pointer">
            <Eye className="w-3.5 h-3.5" />Open
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end" role="dialog" aria-modal="true" aria-label="Review application">
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-indigo-300 bg-slate-800 px-2.5 py-1 rounded-md">{application.reference_code}</span>
              <span className="text-xs text-slate-400">Student No. {application.student_number}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_COLORS[application.status]}`}>{application.status}</span>
              {application.is_renewal && <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded"><RefreshCw className="w-3 h-3" />Renewal</span>}
            </div>
            <h2 className="text-lg font-bold mt-1">{application.first_name} {application.middle_name ? application.middle_name + ' ' : ''}{application.last_name}</h2>
            <p className="text-xs text-indigo-200">{application.scholarship_title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white p-2 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6 text-xs flex-1 overflow-y-auto">
          {notice && (
            <div className="bg-sky-50 border border-sky-200 text-sky-900 p-3 rounded-xl flex items-start gap-2"><Info className="w-4 h-4 shrink-0" />{notice}</div>
          )}

          {/* Key facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div><span className="text-[10px] text-slate-500 font-bold block">Program & year</span><span className="font-bold text-slate-900">{application.program}</span><span className="text-slate-500 block text-[10px]">{application.year_level}</span></div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">GWA (Registrar)</span>
              <span className="font-extrabold text-indigo-700 text-sm">{application.gwa.toFixed(2)}</span>
              {scholarship && <span className={`text-[10px] font-bold block ${application.gwa <= scholarship.min_gwa ? 'text-emerald-600' : 'text-rose-600'}`}>{application.gwa <= scholarship.min_gwa ? `Meets ${scholarship.min_gwa.toFixed(2)}` : `Below ${scholarship.min_gwa.toFixed(2)}`}</span>}
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">Family income / yr</span>
              <span className="font-bold text-slate-900">{peso(application.annual_family_income ?? application.monthly_family_income * 12)}</span>
              {scholarship && scholarship.max_family_income > 0 && <span className="text-[10px] text-slate-500 block">Limit {peso(scholarship.max_family_income)}</span>}
            </div>
            <div><span className="text-[10px] text-slate-500 font-bold block">Submitted</span><span className="font-bold text-slate-900">{fmt(application.created_at)}</span><span className="text-[10px] text-slate-500 block truncate">{application.phone}</span></div>
          </div>
          <p className="text-[10px] text-slate-500 -mt-4">{GWA_SCALE_NOTE}</p>

          {(application.endorsed_by || application.approved_at) && (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3">
              {application.endorsed_by && <div><span className="text-[10px] text-emerald-700 font-bold block">Endorsed by</span><span className="font-semibold">{application.endorsed_by}</span><span className="block text-[10px] text-slate-500">{fmt(application.endorsed_at)}</span></div>}
              {application.approved_by && <div><span className="text-[10px] text-emerald-700 font-bold block">Approved by</span><span className="font-semibold">{application.approved_by}</span><span className="block text-[10px] text-slate-500">{fmt(application.approved_at)}</span></div>}
              {application.grant_term && <div><span className="text-[10px] text-emerald-700 font-bold block">Grant covers</span><span className="font-semibold">{application.grant_term}</span><span className="block text-[10px] text-slate-500">until {fmt(application.expires_at)}</span></div>}
            </div>
          )}

          {application.status === 'Removed' && application.removal_reason && (
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex items-start gap-2.5"><ShieldAlert className="w-4 h-4 text-red-600 shrink-0" /><div><p className="font-bold text-red-800">Removal reason</p><p className="text-red-700">{application.removal_reason}</p></div></div>
          )}

          {/* Document checklist */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900">Document checklist</h3>
              <span className={`font-bold px-2 py-0.5 rounded ${missingCount ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {checklist.length - missingCount} of {checklist.length} submitted · {verified.size} verified
              </span>
            </div>
            {checklist.map((c) => docRow(c.label, docFor(c.label, c.code), c.why))}
            {extraDocs.length > 0 && (
              <>
                <p className="text-[11px] font-bold text-slate-500 pt-2">Other files attached</p>
                {extraDocs.map((d) => docRow(d.label || d.name, d))}
              </>
            )}
          </section>

          {/* Household */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">Declared household income</h3>
            {(application.household_members || []).map((m) => (
              <div key={m.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800">{m.name}</span> ({m.relation})
                  <span className="block text-[10px] text-slate-500">{m.employment_status || (memberEarns(m) ? 'Employed' : 'Unemployed')} · {m.occupation}</span>
                </div>
                <span className="font-bold text-indigo-700">{peso(memberAnnualIncome(m))} / yr</span>
              </div>
            ))}
            {application.is_working_student && (
              <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg flex justify-between"><span className="font-bold text-indigo-900">Applicant (working student)</span><span className="font-bold text-indigo-700">{peso(application.student_annual_income || 0)} / yr</span></div>
            )}
          </section>

          {/* Screening answers */}
          {scholarship && screeningQuestionsFor(scholarship).length > 0 && (
            <section className="space-y-2">
              <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">Screening answers</h3>
              {screeningQuestionsFor(scholarship).map((q) => (
                <div key={q.id}>
                  <p className="text-[11px] text-slate-500">{q.label}</p>
                  <p className="font-semibold text-slate-900 whitespace-pre-wrap">{application.screening_answers?.[q.id] || '— not answered —'}</p>
                </div>
              ))}
            </section>
          )}

          {/* Decision */}
          <section className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-indigo-700 flex items-center gap-1.5"><Award className="w-4 h-4" />Decision</h3>

            {!isAdmin && (
              <p className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2.5">Staff can review, shortlist, reject and endorse. Final approval is given by a System Administrator.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rv-status" className="block font-bold text-slate-700 mb-1">New status</label>
                <select id="rv-status" value={status} onChange={(e) => { setStatus(e.target.value as ApplicationStatus); setError(null); }} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {!statusOptions.some((o) => o.value === status) && <option value={status}>{status}</option>}
                  {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="rv-amount" className="block font-bold text-slate-700 mb-1">
                  {status === 'For Approval' ? 'Recommended grant per semester (₱)' : 'Grant per semester (₱)'}
                </label>
                <input
                  id="rv-amount"
                  inputMode="numeric"
                  disabled={!amountMatters}
                  value={amountMatters && awardedAmount !== '' ? Number(awardedAmount).toLocaleString('en-US') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setAwardedAmount(raw ? Math.min(parseInt(raw, 10), maxGrant || Number.MAX_SAFE_INTEGER) : '');
                  }}
                  className={`w-full p-2.5 border rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none ${amountMatters ? 'bg-white border-slate-300 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {amountMatters ? `Allowed range: ${peso(minGrant)} – ${peso(maxGrant)}` : 'Set when endorsing or approving.'}
                </p>
              </div>
            </div>

            {amountMatters && (
              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-indigo-950">Grant validity (set automatically)</p>
                  <p className="text-indigo-900">Covers <strong>{awardTerm.label}</strong> ({formatTermRange(awardTerm)}). It expires at the end of the semester; {scholarship?.is_renewable ? 'the scholar can then submit a renewal.' : 'this scholarship is not renewable.'}</p>
                </div>
              </div>
            )}

            {status === 'Shortlisted' && (
              <div className="bg-white border border-indigo-200 p-3.5 rounded-xl space-y-3">
                <p className="font-bold text-indigo-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Interview</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rv-int-dt" className="block text-[11px] font-bold text-slate-600 mb-1">Date and time</label>
                    <input id="rv-int-dt" type="datetime-local" value={interviewDateTime} onChange={(e) => setInterviewDateTime(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label htmlFor="rv-int-who" className="block text-[11px] font-bold text-slate-600 mb-1">Interviewer</label>
                    <input id="rv-int-who" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label htmlFor="rv-int-loc" className="block text-[11px] font-bold text-slate-600 mb-1">Venue or meeting link</label>
                  <input id="rv-int-loc" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
            )}

            {status === 'Removed' && (
              <div>
                <label htmlFor="rv-removal" className="block font-bold text-red-700 mb-1">Reason for removal (shown to the student)</label>
                <textarea id="rv-removal" rows={2} value={removalReason} maxLength={300} onChange={(e) => setRemovalReason(e.target.value)} className="w-full p-2.5 bg-white border border-red-300 rounded-xl" />
              </div>
            )}

            <div>
              <label htmlFor="rv-remarks" className="block font-bold text-slate-700 mb-1">Message to the student</label>
              <textarea id="rv-remarks" rows={2} value={remarks} maxLength={400} onChange={(e) => setRemarks(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl" />
              <p className="text-[10px] text-slate-500 mt-0.5">Shown in the student's My Applications page.</p>
            </div>
            <div>
              <label htmlFor="rv-notes" className="block font-bold text-slate-700 mb-1">Internal notes (staff only)</label>
              <textarea id="rv-notes" rows={2} value={staffNotes} maxLength={400} onChange={(e) => setStaffNotes(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl" />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 space-y-3 shrink-0">
          {error && (
            <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              {isAdmin && onDeleteApplication && (
                !confirmDelete ? (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs rounded-xl inline-flex items-center gap-1 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />Delete
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-[11px] font-bold text-rose-600">Delete permanently?</span>
                    <button type="button" onClick={() => { onDeleteApplication(application.id); onClose(); }} className="px-2.5 py-1.5 bg-rose-600 text-white font-bold text-[11px] rounded-lg cursor-pointer">Delete</button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1.5 bg-white border border-slate-300 text-[11px] rounded-lg cursor-pointer">Keep</button>
                  </span>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Close</button>
              <button type="button" onClick={handleSaveDraft} disabled={saving} className="px-4 py-2 bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
                <Save className="w-3.5 h-3.5" />Save draft
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving || status === application.status && remarks === application.remarks && staffNotes === (application.staff_notes || '')} className="px-5 py-2 text-white font-bold text-xs rounded-xl bg-slate-900 hover:bg-indigo-600 inline-flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed">
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'Saving…' : status === application.status ? 'Update message & notes' : ACTION_LABEL[status] || `Set status to ${status}`}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {inspectDoc && (
        <DocumentViewerModal document={inspectDoc} studentName={`${application.first_name} ${application.last_name}`} studentNumber={application.student_number} onClose={() => setInspectDoc(null)} />
      )}
    </div>
  );
};
