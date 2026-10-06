import { InterviewerPicker } from './InterviewerPicker';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X, CheckCircle2, FileText, Award, Eye, Trash2, AlertTriangle, RefreshCw, Clock, ShieldAlert, Calendar,
  AlertCircle, Circle, Info, Users,
} from 'lucide-react';
import { Application, ApplicationStatus, ApplicationDocument, Scholarship, InterviewSchedule, UserProfile } from '../../types';
import { InterviewOutcomeModal } from './InterviewOutcomeModal';
import { DocumentViewerModal } from '../common/DocumentViewerModal';
import { buildDocumentChecklist, legacyScreeningQuestionsFor, memberAnnualIncome, memberEarns } from '../../lib/scholarshipRules';
import { INTERVIEW_SLOTS, slotLabel, slotKey, interviewKey, isInterviewerBusy, freeInterviewers, isWeekday } from '../../lib/interviewSlots';
import { getAwardTerm, formatTermRange, GWA_SCALE_NOTE } from '../../data/universityRegistry';

interface ApplicationReviewDrawerProps {
  application: Application;
  scholarships?: Scholarship[];
  currentUser?: UserProfile;
  onClose: () => void;
  onUpdateApplication: (updatedApp: Application) => void | Promise<void>;
  onDeleteApplication?: (id: string) => void;
  onSaveInterview?: (interview: InterviewSchedule) => void;
  /** All scheduled interviews, used to show which times and interviewers are free. */
  interviews?: InterviewSchedule[];
  /** Names offered in the interviewer dropdown (a different name can still be typed). */
  interviewerNames?: string[];
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

const todayStr = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
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
  interviews = [],
  interviewerNames = [],
}) => {
  // Only the Scholarship Coordinator can grant final approval. Legacy 'admin' is treated
  // as coordinator for backward compatibility with any pre-migration persisted account.
  const isCoordinator = currentUser?.role === 'coordinator' || currentUser?.role === 'admin';
  const isAdmin = isCoordinator; // kept for readability where "admin-level" means "may approve"
  // Once the Scholarship Coordinator has approved, staff can no longer change the decision.
  const decisionLocked = !isCoordinator && application.status === 'Approved';
  const scholarship = scholarships.find((s) => s.id === application.scholarship_id);

  const initialStatus: ApplicationStatus = application.status === 'Pending' ? 'In Review' : application.status;
  const sameApp = (i: { application_id: string }) => i.application_id === application.id || i.application_id === application.reference_code;
  const existingInterview = interviews.find((i) => sameApp(i) && i.status === 'Scheduled');
  const completedInterview = interviews.find((i) => sameApp(i) && i.status === 'Completed');
  const [showOutcome, setShowOutcome] = useState(false);
  const existingKey = existingInterview ? interviewKey(existingInterview) : null;
  const initialVerified = application.documents.filter((d) => d.verified).map((d) => d.id);
  const initialAmount = application.awarded_amount || scholarship?.grant_amount || '';

  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [awardedAmount, setAwardedAmount] = useState<number | ''>(initialAmount);
  const [remarks, setRemarks] = useState(application.remarks ?? '');
  const [staffNotes, setStaffNotes] = useState(application.staff_notes ?? '');
  const [removalReason, setRemovalReason] = useState(application.removal_reason || '');
  const [verified, setVerified] = useState<Set<string>>(new Set(initialVerified));
  const [inspectDoc, setInspectDoc] = useState<ApplicationDocument | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [interviewDate, setInterviewDate] = useState(existingKey ? existingKey.slice(0, 10) : '');
  const [interviewTime, setInterviewTime] = useState(existingKey ? existingKey.slice(11, 16) : '');
  const [interviewLocation, setInterviewLocation] = useState(existingInterview?.location || 'Office of Student Financial Assistance, Room 204');
  const [interviewerName, setInterviewerName] = useState(existingInterview?.interviewer || '');

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

  // Once every document is verified, saving moves the application on to the interview stage automatically.
  const allVerified = application.documents.length > 0 && missingCount === 0 && verified.size >= application.documents.length;
  const autoAdvance = !decisionLocked && !isCoordinator && status === 'In Review' && allVerified;
  const finalStatus: ApplicationStatus = autoAdvance ? 'Shortlisted' : status;
  const amountMatters = finalStatus === 'Approved';

  // Staff move an application through review and interview; the Coordinator only approves or rejects.
  const statusOptions: { value: ApplicationStatus; label: string }[] = isCoordinator
    ? [
        ...(!['Approved', 'Rejected', 'Removed'].includes(initialStatus)
          ? [{ value: initialStatus, label: initialStatus === 'For Approval' ? 'For approval — waiting for your decision' : `${initialStatus === 'Shortlisted' ? 'For interview' : 'In review'} — not yet endorsed` }]
          : []),
        { value: 'Approved', label: 'Approved — award the grant' },
        { value: 'Rejected', label: 'Rejected — not selected' },
        ...(['Approved', 'Removed'].includes(application.status) ? [{ value: 'Removed' as ApplicationStatus, label: 'Removed — policy failure' }] : []),
      ]
    : [
        { value: 'In Review', label: 'In review — checking documents' },
        { value: 'Shortlisted', label: 'For interview' },
        ...(application.status === 'For Approval' ? [{ value: 'For Approval' as ApplicationStatus, label: 'For approval — endorsed by the Interviewer' }] : []),
        { value: 'Rejected', label: 'Rejected — not selected' },
      ];

  // Interview scheduling: which slots and which interviewers are free.
  const today = todayStr();
  const slotIsPast = (hhmm: string) => interviewDate === today && new Date(`${interviewDate}T${hhmm}`) <= new Date();
  const slotIsTaken = (hhmm: string) => {
    if (!interviewDate) return false;
    const key = slotKey(interviewDate, hhmm);
    if (interviewerName.trim()) return isInterviewerBusy(interviews, interviewerName, key, application.id);
    return interviewerNames.length > 0 && freeInterviewers(interviews, interviewerNames, key, application.id).length === 0;
  };
  const freeNow = interviewDate && interviewTime ? freeInterviewers(interviews, interviewerNames, slotKey(interviewDate, interviewTime), application.id) : [];
  const interviewChosen = Boolean(interviewDate && interviewTime);
  const notEndorsed = completedInterview?.outcome?.recommendation === 'do_not_recommend';

  const dirty =
    status !== initialStatus ||
    (amountMatters && Number(awardedAmount || 0) !== Number(initialAmount || 0)) ||
    remarks !== (application.remarks ?? '') ||
    staffNotes !== (application.staff_notes ?? '') ||
    removalReason !== (application.removal_reason || '') ||
    verified.size !== initialVerified.length || initialVerified.some((id) => !verified.has(id)) ||
    interviewDate !== (existingKey ? existingKey.slice(0, 10) : '') ||
    interviewTime !== (existingKey ? existingKey.slice(11, 16) : '') ||
    interviewerName !== (existingInterview?.interviewer || '') ||
    interviewLocation !== (existingInterview?.location || 'Office of Student Financial Assistance, Room 204');

  const validate = (): string | null => {
    if (finalStatus === 'Approved' && application.status !== 'Approved' && !isCoordinator) return 'Only the Scholarship Coordinator can approve.';
    if (finalStatus === 'Approved' && application.status !== 'Approved' && application.status !== 'For Approval' && !completedInterview) return 'This applicant has not been endorsed by the Interviewer yet.';
    if (amountMatters) {
      const amt = Number(awardedAmount) || 0;
      if (amt < minGrant) return `The grant must be at least ${peso(minGrant)} per semester for this scholarship.`;
      if (amt > maxGrant) return `The grant cannot exceed ${peso(maxGrant)} per semester for this scholarship.`;
    }
    if (finalStatus === 'Approved' && missingCount > 0) return `${missingCount} required document${missingCount === 1 ? ' is' : 's are'} missing. The applicant cannot be approved until every document is on file.`;
    if (finalStatus === 'Approved' && verified.size < application.documents.length) return 'Tick "Verified" on every submitted document before approving.';
    if (finalStatus === 'Rejected' && !remarks.trim()) return 'Explain to the student why the application was not selected (student-visible message).';
    if (finalStatus === 'Removed' && !removalReason.trim()) return 'Enter the reason for removing this scholar.';
    if (finalStatus === 'Shortlisted' && (interviewDate || interviewTime)) {
      if (!interviewDate || !interviewTime) return 'Choose both a date and a time for the interview.';
      if (!isWeekday(interviewDate)) return 'Interviews are held Monday to Friday. Choose a weekday.';
      if (new Date(`${interviewDate}T${interviewTime}`) <= new Date()) return 'The interview must be scheduled in the future.';
      if (!interviewerName.trim()) return 'Choose or type the interviewer.';
      if (isInterviewerBusy(interviews, interviewerName, slotKey(interviewDate, interviewTime), application.id)) return `${interviewerName} already has an interview at that time. Choose another time or interviewer.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    setError(problem);
    if (problem) return;

    const now = new Date().toISOString();
    const scheduled = finalStatus === 'Shortlisted' && interviewChosen;
    const startDate = scheduled ? new Date(`${interviewDate}T${interviewTime}`) : null;
    const when = startDate ? startDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    // Tell the student about the interview unless the staff member wrote their own message.
    const remarksOut = scheduled && remarks === (application.remarks ?? '')
      ? `Your documents are verified. Interview: ${when} at ${interviewLocation.trim() || 'the Office of Student Financial Assistance'} with ${interviewerName.trim()}.`
      : finalStatus === 'Shortlisted' && !scheduled && remarks === (application.remarks ?? '')
        ? 'Your documents are verified. You will be notified of your interview schedule.'
        : remarks.trim();

    const updated: Application = {
      ...application,
      status: finalStatus,
      awarded_amount: amountMatters ? Number(awardedAmount) || 0 : finalStatus === 'Rejected' ? 0 : application.awarded_amount,
      remarks: remarksOut,
      staff_notes: staffNotes.trim(),
      removal_reason: finalStatus === 'Removed' ? removalReason.trim() : application.removal_reason,
      documents: application.documents.map((d) => ({ ...d, verified: verified.has(d.id) })),
      review_draft: null as any, // clears any draft saved by an older version
      updated_at: now,
    };

    if (finalStatus === 'For Approval' && application.status !== 'For Approval') {
      updated.endorsed_by = currentUser?.full_name;
      updated.endorsed_at = now;
    }
    if (finalStatus === 'Approved' && application.status !== 'Approved') {
      updated.approved_at = now;
      updated.approved_by = `${currentUser?.full_name} (Scholarship Coordinator)`;
      updated.approved_by_id = currentUser?.id;
      updated.grant_term = awardTerm.label;
      updated.expires_at = new Date(awardTerm.end + 'T23:59:59').toISOString();
    }

    setSaving(true);
    try {
      if (scheduled && onSaveInterview && startDate) {
        onSaveInterview({
          id: existingInterview?.id || `inv-${Date.now()}`,
          application_id: application.id,
          student_name: `${application.first_name} ${application.last_name} (${application.student_number})`,
          scholarship_title: application.scholarship_title,
          date_time: when,
          start_iso: slotKey(interviewDate, interviewTime),
          location: interviewLocation.trim() || 'Office of Student Financial Assistance',
          interviewer: interviewerName.trim(),
          status: 'Scheduled',
        });
      }
      await onUpdateApplication(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'The changes could not be saved.');
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
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_COLORS[application.status]}`}>{application.status === 'Shortlisted' ? 'For Interview' : application.status === 'Pending' ? 'In Review' : application.status}</span>
              {application.is_renewal && <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded"><RefreshCw className="w-3 h-3" />Renewal</span>}
            </div>
            <h2 className="text-lg font-bold mt-1">{application.first_name} {application.middle_name ? application.middle_name + ' ' : ''}{application.last_name}</h2>
            <p className="text-xs text-indigo-200">{application.scholarship_title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white p-2 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6 text-xs flex-1 overflow-y-auto">

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
          {scholarship && Object.keys(application.screening_answers || {}).length > 0 && (
            <section className="space-y-2">
              <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">Screening answers</h3>
              {legacyScreeningQuestionsFor(scholarship).map((q) => (
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
              <p className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2.5">Staff verify documents and schedule the interview; you can reject at any time if documents are invalid. After the interview, the Interviewer endorses or rejects. Final approval is given by the Scholarship Coordinator.</p>
            )}

            {autoAdvance && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Every document is verified. Saving will move this application to <strong>For interview</strong>.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rv-status" className="block font-bold text-slate-700 mb-1">Status</label>
                {decisionLocked ? (
                  <p id="rv-status" className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700">Approved by the Scholarship Coordinator</p>
                ) : (
                  <select id="rv-status" value={finalStatus} onChange={(e) => { setStatus(e.target.value as ApplicationStatus); setError(null); }} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    {!statusOptions.some((o) => o.value === finalStatus) && <option value={finalStatus}>{finalStatus}</option>}
                    {statusOptions.map((o) => <option key={o.value} value={o.value} disabled={o.value === 'For Approval' && !completedInterview && finalStatus !== 'For Approval'}>{o.label}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="rv-amount" className="block font-bold text-slate-700 mb-1">
                  {finalStatus === 'For Approval' ? 'Recommended grant per semester (₱)' : 'Grant per semester (₱)'}
                </label>
                <input
                  id="rv-amount"
                  inputMode="numeric"
                  disabled={!amountMatters || decisionLocked}
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

            {completedInterview && (
              <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${notEndorsed ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div>
                  <p className={`font-bold ${notEndorsed ? 'text-rose-900' : 'text-emerald-900'}`}>Interview done · {notEndorsed ? 'Not endorsed (rejected)' : 'Endorsed for approval'}</p>
                  <p className="text-[11px] text-slate-600">{completedInterview.interviewer} · {completedInterview.date_time}</p>
                </div>
                {completedInterview.outcome && (
                  <button type="button" onClick={() => setShowOutcome(true)} className="px-3 py-1.5 bg-white border border-slate-300 font-bold rounded-lg hover:bg-slate-50 cursor-pointer">View interview result</button>
                )}
              </div>
            )}

            {finalStatus === 'Shortlisted' && !decisionLocked && !completedInterview && (
              <div className="bg-white border border-indigo-200 p-3.5 rounded-xl space-y-3">
                <p className="font-bold text-indigo-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Interview schedule</p>
                {existingInterview && (
                  <p className="text-[11px] text-slate-600">Currently scheduled: <strong>{existingInterview.date_time}</strong> with {existingInterview.interviewer}. Pick a new time to reschedule.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rv-int-who" className="block text-[11px] font-bold text-slate-600 mb-1">Interviewer</label>
                    <InterviewerPicker
                      id="rv-int-who"
                      value={interviewerName}
                      names={interviewerNames}
                      busy={interviewDate && interviewTime ? interviewerNames.filter((n) => isInterviewerBusy(interviews, n, slotKey(interviewDate, interviewTime), application.id)) : []}
                      onChange={(n) => { setInterviewerName(n); setError(null); }}
                    />
                  </div>
                  <div>
                    <label htmlFor="rv-int-date" className="block text-[11px] font-bold text-slate-600 mb-1">Date (Monday–Friday)</label>
                    <input
                      id="rv-int-date"
                      type="date"
                      min={today}
                      value={interviewDate}
                      onChange={(e) => { setInterviewDate(e.target.value); setInterviewTime(''); setError(null); }}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {interviewDate && !isWeekday(interviewDate) && (
                  <p className="text-[11px] text-rose-700 font-semibold">No interviews on weekends. Choose a weekday.</p>
                )}

                {interviewDate && isWeekday(interviewDate) && (
                  <div>
                    <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Available times{interviewerName.trim() ? ` for ${interviewerName.trim()}` : ''}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {INTERVIEW_SLOTS.map((t) => {
                        const unavailable = slotIsPast(t) || slotIsTaken(t);
                        const selected = interviewTime === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={unavailable}
                            onClick={() => { setInterviewTime(t); setError(null); }}
                            aria-pressed={selected}
                            className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${
                              selected ? 'bg-indigo-600 border-indigo-600 text-white'
                              : unavailable ? 'bg-slate-100 border-slate-200 text-slate-300 line-through cursor-not-allowed'
                              : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            {slotLabel(t)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Crossed-out times are already booked or have passed.</p>
                  </div>
                )}

                {interviewDate && interviewTime && interviewerNames.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 mb-1.5"><Users className="w-3.5 h-3.5" />Interviewers free at {slotLabel(interviewTime)}</p>
                    {freeNow.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {freeNow.map((n) => (
                          <button key={n} type="button" onClick={() => setInterviewerName(n)} className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${interviewerName.trim().toLowerCase() === n.toLowerCase() ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400'}`}>{n}</button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-rose-700 font-semibold">Everyone is booked at this time. Choose another time.</p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="rv-int-loc" className="block text-[11px] font-bold text-slate-600 mb-1">Venue or meeting link</label>
                  <input id="rv-int-loc" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                {!existingInterview && !interviewChosen && <p className="text-[11px] text-amber-700 font-semibold">No interview time is set yet.</p>}
                <p className="text-[10px] text-slate-500">After the interview, the Interviewer marks it as done and either endorses the applicant for approval or rejects.</p>
              </div>
            )}

            {finalStatus === 'Removed' && (
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
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !dirty || decisionLocked && !(remarks !== (application.remarks ?? '') || staffNotes !== (application.staff_notes ?? ''))}
                className="px-5 py-2 text-white font-bold text-xs rounded-xl bg-slate-900 hover:bg-indigo-600 inline-flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {showOutcome && completedInterview && (
        <InterviewOutcomeModal
          interview={completedInterview}
          category={scholarship?.category}
          interviewerName={currentUser?.full_name || ''}
          readOnly
          onClose={() => setShowOutcome(false)}
        />
      )}

      {inspectDoc && (
        <DocumentViewerModal document={inspectDoc} studentName={`${application.first_name} ${application.last_name}`} studentNumber={application.student_number} onClose={() => setInspectDoc(null)} />
      )}
    </div>
  );
};
