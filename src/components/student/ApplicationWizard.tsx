import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, CheckCircle2, ShieldCheck, ShieldAlert, AlertCircle,
  Copy, Sparkles, Clock, Lock, Info, FileText, Eye, Circle,
} from 'lucide-react';
import { Scholarship, HouseholdMember, ApplicationDocument, Application, UserProfile } from '../../types';
import { DocumentUploader } from '../common/DocumentUploader';
import { DocumentViewerModal } from '../common/DocumentViewerModal';
import { checkDuplicateApplication } from '../../lib/duplicateCheck';
import {
  checkEligibility, screeningQuestionsFor, validateScreeningAnswers, buildDocumentChecklist, standardFileName,
  FILENAME_FORMAT_HINT, HOUSEHOLD_STATUSES, MIN_DECLARED_ANNUAL_INCOME, INDIGENCY_THRESHOLD, memberAnnualIncome, memberEarns,
} from '../../lib/scholarshipRules';
import { findRegistrarStudent, studentFullName, GWA_SCALE_NOTE, getAwardTerm } from '../../data/universityRegistry';

interface ApplicationWizardProps {
  scholarship: Scholarship;
  student: UserProfile;
  onClose: () => void;
  onSubmitSuccess: (newApp: Application) => Promise<void> | void;
  applications?: Application[];
  onTrackExisting?: (referenceCode: string) => void;
  isRenewal?: boolean;
  renewedFrom?: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEP_LABELS = ['Your details', 'Family income', 'Screening questions', 'Documents', 'Review & submit'];
const RELATIONS = ['Father', 'Mother', 'Legal guardian', 'Spouse', 'Sibling'];

const nameOk = (v: string) => /^[A-Za-zÑñ.\s'-]+$/.test(v.trim());
const peso = (n: number) => `₱${n.toLocaleString()}`;
const digits = (v: string) => v.replace(/\D/g, '');

const formatPhilippinePhone = (val: string) => {
  const d = digits(val).slice(0, 11);
  let res = d.slice(0, 4);
  if (d.length > 4) res += ' ' + d.slice(4, 7);
  if (d.length > 7) res += ' ' + d.slice(7, 11);
  return res;
};
const validPhone = (v: string) => /^09\d{9}$/.test(digits(v));

const emptyMember = { first: '', middle: '', last: '', relation: 'Father', status: 'Employed' as HouseholdMember['employment_status'], occupation: '', income: '' };

export const ApplicationWizard: React.FC<ApplicationWizardProps> = ({
  scholarship,
  student,
  onClose,
  onSubmitSuccess,
  applications = [],
  onTrackExisting,
  isRenewal = false,
  renewedFrom,
}) => {
  const record = useMemo(() => findRegistrarStudent(student.university_id || ''), [student.university_id]);
  const [step, setStep] = useState<Step>(1);

  // Editable data
  const [phone, setPhone] = useState(formatPhilippinePhone(record?.mobile || student.phone || ''));
  const [isWorkingStudent, setIsWorkingStudent] = useState(false);
  const [studentIncome, setStudentIncome] = useState('');
  const [household, setHousehold] = useState<HouseholdMember[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, ApplicationDocument>>({});
  const [agree, setAgree] = useState(false);

  // Household member editor
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdApp, setCreatedApp] = useState<Application | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ApplicationDocument | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && !previewDoc && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, previewDoc]);

  // Renewals start from the previous application's household and answers (documents must be new)
  useEffect(() => {
    if (!isRenewal || !renewedFrom) return;
    const prev = applications.find((a) => a.reference_code === renewedFrom);
    if (!prev) return;
    setHousehold(prev.household_members || []);
    setAnswers(prev.screening_answers || {});
    setIsWorkingStudent(Boolean(prev.is_working_student));
    setStudentIncome(prev.student_annual_income ? prev.student_annual_income.toLocaleString('en-US') : '');
  }, [isRenewal, renewedFrom]);

  const eligibility = useMemo(
    () => checkEligibility(scholarship, { program: record?.program, year_level: record?.year_level, gwa: record?.gwa }, applications),
    [scholarship, record, applications]
  );
  const duplicate = useMemo(
    () => checkDuplicateApplication(applications, scholarship.id, record?.email, record?.student_number, isRenewal),
    [applications, scholarship.id, record, isRenewal]
  );

  const studentIncomeNum = Number(digits(studentIncome)) || 0;
  const annualIncome = household.reduce((acc, m) => acc + memberAnnualIncome(m), 0) + (isWorkingStudent ? studentIncomeNum : 0);
  const incomeExceeded = scholarship.max_family_income > 0 && annualIncome > scholarship.max_family_income;

  const questions = screeningQuestionsFor(scholarship);
  const checklist = useMemo(
    () => buildDocumentChecklist(scholarship, household, { isWorkingStudent, annualFamilyIncome: annualIncome, answers }),
    [scholarship, household, isWorkingStudent, annualIncome, answers]
  );
  const uploadedCount = checklist.filter((c) => docs[c.key]).length;

  if (!record) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md text-sm space-y-3">
          <p className="font-bold">Your Registrar record could not be found.</p>
          <p className="text-slate-600 text-xs">Only students with an active Registrar record can apply. Contact the Registrar's Office.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer">Close</button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- household editor
  const openMemberForm = (m?: HouseholdMember) => {
    setError(null);
    if (m) {
      setEditingId(m.id);
      setMemberForm({
        first: m.first_name || '',
        middle: m.middle_name || '',
        last: m.last_name || '',
        relation: m.relation,
        status: m.employment_status || (memberEarns(m) ? 'Employed' : 'Unemployed'),
        occupation: m.occupation === 'N/A' ? '' : m.occupation,
        income: memberAnnualIncome(m) ? memberAnnualIncome(m).toLocaleString('en-US') : '',
      });
    } else {
      setEditingId(null);
      setMemberForm(emptyMember);
    }
    setShowMemberForm(true);
  };

  const saveMember = () => {
    const f = memberForm;
    if (!f.first.trim() || !f.last.trim()) return setError('Enter the household member’s first and last name.');
    if (!nameOk(f.first) || !nameOk(f.last) || (f.middle && !nameOk(f.middle))) return setError('Names can only contain letters, spaces, periods, apostrophes and hyphens.');
    const earns = f.status !== 'Unemployed';
    const income = earns ? Number(digits(f.income)) || 0 : 0;
    if (earns && !f.occupation.trim()) return setError('Enter the member’s occupation or type of business.');
    if (earns && income < MIN_DECLARED_ANNUAL_INCOME) {
      return setError(`Annual income for an earning member must be at least ${peso(MIN_DECLARED_ANNUAL_INCOME)}. If they earn less, mark them as Unemployed.`);
    }
    if ((f.relation === 'Father' || f.relation === 'Mother') && household.some((m) => m.relation === f.relation && m.id !== editingId)) {
      return setError(`You already added your ${f.relation.toLowerCase()}.`);
    }
    const full = `${f.first.trim()} ${f.middle.trim() ? f.middle.trim() + ' ' : ''}${f.last.trim()}`;
    const member: HouseholdMember = {
      id: editingId || `hm-${Date.now()}`,
      first_name: f.first.trim(),
      middle_name: f.middle.trim() || undefined,
      last_name: f.last.trim(),
      name: full,
      relation: f.relation,
      employment_status: f.status,
      occupation: earns ? f.occupation.trim() : 'Unemployed',
      annual_income: income,
      monthly_income: Math.round(income / 12),
    };
    setHousehold((prev) => (editingId ? prev.map((m) => (m.id === editingId ? member : m)) : [...prev, member]));
    setShowMemberForm(false);
    setEditingId(null);
    setError(null);
  };

  // ---------------------------------------------------------------- step validation
  const validate = (s: Step): string | null => {
    if (s === 1) {
      if (duplicate.isDuplicate) return duplicate.message;
      if (!eligibility.eligible) return eligibility.reasons[0];
      if (!validPhone(phone)) return 'Enter a valid Philippine mobile number that starts with 09 (11 digits).';
    }
    if (s === 2) {
      if (household.length === 0) return 'Add at least one parent or guardian, even if they have no income.';
      if (!household.some((m) => ['Father', 'Mother', 'Legal guardian', 'Spouse'].includes(m.relation))) return 'Add at least one parent, legal guardian or spouse.';
      if (isWorkingStudent && studentIncomeNum < MIN_DECLARED_ANNUAL_INCOME) return `As a working student, enter your annual income (at least ${peso(MIN_DECLARED_ANNUAL_INCOME)}).`;
      if (incomeExceeded) return `Your declared family income (${peso(annualIncome)}) is above this scholarship's limit of ${peso(scholarship.max_family_income)}.`;
    }
    if (s === 3) return validateScreeningAnswers(scholarship, answers);
    if (s === 4) {
      const missing = checklist.find((c) => !docs[c.key]);
      if (missing) return `Upload: ${missing.label}. (${checklist.length - uploadedCount} document${checklist.length - uploadedCount === 1 ? '' : 's'} still missing.)`;
    }
    if (s === 5 && !agree) return 'Tick the declaration to confirm your information is true.';
    return null;
  };

  const goNext = () => {
    const msg = validate(step);
    setError(msg);
    if (!msg) {
      // Skip the screening step if this scholarship type has no questions
      const next = (step === 2 && questions.length === 0 ? 4 : step + 1) as Step;
      setStep(next);
    }
  };
  const goBack = () => {
    setError(null);
    setStep((step === 4 && questions.length === 0 ? 2 : step - 1) as Step);
  };

  const handleSubmit = async () => {
    for (const s of [1, 2, 3, 4, 5] as Step[]) {
      const msg = validate(s);
      if (msg) {
        setError(msg);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const newApp: Application = {
        id: `app-${Date.now()}`,
        reference_code: `MU-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        scholarship_id: scholarship.id,
        scholarship_title: scholarship.title,
        student_number: record.student_number,
        first_name: record.first_name,
        middle_name: record.middle_name,
        last_name: record.last_name,
        gender: record.sex,
        birthdate: record.birthdate,
        email: record.email,
        phone: digits(phone),
        program: record.program,
        year_level: record.year_level,
        gwa: record.gwa,
        is_working_student: isWorkingStudent,
        student_annual_income: isWorkingStudent ? studentIncomeNum : 0,
        monthly_family_income: Math.round(annualIncome / 12),
        annual_family_income: annualIncome,
        household_members: household,
        documents: checklist.map((c) => docs[c.key]).filter(Boolean),
        screening_answers: answers,
        status: 'In Review', // new applications go straight to review
        awarded_amount: 0,
        remarks: isRenewal
          ? `Renewal received (previous reference ${renewedFrom}). It will be reviewed in the order it was submitted.`
          : 'Application received. It will be reviewed in the order it was submitted.',
        is_renewal: isRenewal,
        renewed_from: renewedFrom,
        created_at: now,
        updated_at: now,
      };
      await onSubmitSuccess(newApp);
      setCreatedApp(newApp);
      setStep(6);
    } catch (err: any) {
      setError(err?.message || 'Your application could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const setDoc = (key: string, code: string, label: string, doc: ApplicationDocument | null) => {
    setDocs((prev) => {
      const next = { ...prev };
      if (!doc) delete next[key];
      else
        next[key] = {
          ...doc,
          id: `doc-${key}-${Date.now()}`,
          label,
          requirement_code: code,
          original_name: doc.original_name || doc.name,
          name: standardFileName(record.student_number, record.last_name, code, doc.name),
        };
      return next;
    });
  };

  const field = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none';
  const locked = 'w-full p-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl';
  const visibleSteps = questions.length === 0 ? STEP_LABELS.filter((l) => l !== 'Screening questions') : STEP_LABELS;
  const stepPos = questions.length === 0 && step >= 4 ? step - 1 : step;
  const term = getAwardTerm();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={`Application for ${scholarship.title}`}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-600">{isRenewal ? 'Renewal' : 'Application'}</span>
              <span className="text-xs text-slate-400 font-mono">{scholarship.code}</span>
            </div>
            <h2 className="text-lg font-bold">{scholarship.title}</h2>
            <p className="text-xs text-slate-400">For {term.label} · Apply by {scholarship.deadline}</p>
          </div>
          <button onClick={onClose} aria-label="Close application" className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        {step <= 5 && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
            <ol className="flex items-center justify-between text-[11px] font-bold text-slate-400 gap-1">
              {visibleSteps.map((label, i) => (
                <li key={label} className={`flex items-center gap-1 ${i + 1 <= stepPos ? 'text-indigo-600' : ''}`}>
                  <span>{i + 1}. {label}</span>
                  {i < visibleSteps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block" />}
                </li>
              ))}
            </ol>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(stepPos / visibleSteps.length) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="p-6 max-h-[64vh] overflow-y-auto space-y-5 text-xs">
          {/* STEP 1 — details from the Registrar */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Your details</h3>
                <p className="text-slate-500 mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" />These come from the Registrar and cannot be changed here. Ask the Registrar to correct any mistake.</p>
              </div>

              {duplicate.isDuplicate && duplicate.existingApp && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-start gap-3 text-rose-900">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <div className="space-y-2">
                    <p>{duplicate.message}</p>
                    {onTrackExisting && (
                      <button type="button" onClick={() => onTrackExisting(duplicate.existingApp!.reference_code)} className="font-bold underline cursor-pointer">View that application</button>
                    )}
                  </div>
                </div>
              )}
              {!eligibility.eligible && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-rose-900 space-y-1">
                  <p className="font-bold">You cannot apply for this scholarship</p>
                  {eligibility.reasons.map((r) => <p key={r}>{r}</p>)}
                </div>
              )}

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['Student number', record.student_number],
                  ['Full name', studentFullName(record)],
                  ['Sex', record.sex],
                  ['Birthdate', record.birthdate],
                  ['University email', record.email],
                  ['Degree program', record.program],
                  ['Year level', record.year_level],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-bold text-slate-700 mb-1">{k}</dt>
                    <dd className={locked}>{v}</dd>
                  </div>
                ))}
                <div>
                  <dt className="font-bold text-slate-700 mb-1">Cumulative GWA (Registrar)</dt>
                  <dd className={`${locked} flex items-center justify-between`}>
                    <span className="font-bold">{record.gwa.toFixed(2)}</span>
                    <span className={`text-[11px] font-bold ${record.gwa <= scholarship.min_gwa ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {record.gwa <= scholarship.min_gwa ? `Meets ${scholarship.min_gwa.toFixed(2)} requirement` : `Needs ${scholarship.min_gwa.toFixed(2)} or better`}
                    </span>
                  </dd>
                </div>
              </dl>
              <p className="text-[11px] text-slate-500 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0" />{GWA_SCALE_NOTE}</p>

              <div className="max-w-sm">
                <label htmlFor="wiz-phone" className="block font-bold text-slate-700 mb-1">Mobile number for scholarship updates</label>
                <input id="wiz-phone" inputMode="tel" value={phone} maxLength={13} onChange={(e) => setPhone(formatPhilippinePhone(e.target.value))} className={field} />
                <p className="text-[11px] text-slate-500 mt-1">Prefilled from your Registrar record. Format: 0917 123 4567.</p>
              </div>
            </div>
          )}

          {/* STEP 2 — family income */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Family income</h3>
                <p className="text-slate-500 mt-0.5">List your parents or guardian and every household member who earns. You will upload proof for each one in the Documents step.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900">Household members ({household.length})</h4>
                  {!showMemberForm && (
                    <button type="button" onClick={() => openMemberForm()} className="font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />Add member
                    </button>
                  )}
                </div>

                {showMemberForm && (
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {([['first', 'First name'], ['middle', 'Middle name (optional)'], ['last', 'Last name']] as const).map(([k, l]) => (
                        <div key={k}>
                          <label htmlFor={`hm-${k}`} className="block text-[11px] font-bold text-slate-600 mb-0.5">{l}</label>
                          <input id={`hm-${k}`} value={memberForm[k]} maxLength={50} onChange={(e) => setMemberForm({ ...memberForm, [k]: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="hm-rel" className="block text-[11px] font-bold text-slate-600 mb-0.5">Relationship to you</label>
                        <select id="hm-rel" value={memberForm.relation} onChange={(e) => setMemberForm({ ...memberForm, relation: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg">
                          {RELATIONS.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="hm-status" className="block text-[11px] font-bold text-slate-600 mb-0.5">Work status</label>
                        <select id="hm-status" value={memberForm.status} onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value as HouseholdMember['employment_status'], income: e.target.value === 'Unemployed' ? '' : memberForm.income })} className="w-full p-2 border border-slate-200 rounded-lg">
                          {HOUSEHOLD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    {memberForm.status !== 'Unemployed' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="hm-occ" className="block text-[11px] font-bold text-slate-600 mb-0.5">Occupation or business</label>
                          <input id="hm-occ" value={memberForm.occupation} maxLength={60} onChange={(e) => setMemberForm({ ...memberForm, occupation: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <label htmlFor="hm-inc" className="block text-[11px] font-bold text-slate-600 mb-0.5">Gross annual income (₱)</label>
                          <input id="hm-inc" inputMode="numeric" value={memberForm.income} onChange={(e) => setMemberForm({ ...memberForm, income: digits(e.target.value) ? Number(digits(e.target.value)).toLocaleString('en-US') : '' })} className="w-full p-2 border border-slate-200 rounded-lg font-bold" />
                          <p className="text-[10px] text-slate-500 mt-0.5">Minimum {peso(MIN_DECLARED_ANNUAL_INCOME)}. Must match the proof you upload.</p>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setShowMemberForm(false); setEditingId(null); setError(null); }} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg cursor-pointer">Cancel</button>
                      <button type="button" onClick={saveMember} className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg cursor-pointer">{editingId ? 'Save changes' : 'Add member'}</button>
                    </div>
                  </div>
                )}

                {household.length === 0 && !showMemberForm && <p className="text-slate-500">No household members yet.</p>}
                {household.map((m) => (
                  <div key={m.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-center gap-3">
                    <div>
                      <span className="font-bold text-slate-900">{m.name}</span> <span className="text-slate-500">({m.relation})</span>
                      <span className="block text-[11px] text-slate-500">{m.employment_status || (memberEarns(m) ? 'Employed' : 'Unemployed')}{memberEarns(m) ? ` · ${m.occupation}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-700">{peso(memberAnnualIncome(m))} / yr</span>
                      <button type="button" aria-label={`Edit ${m.name}`} onClick={() => openMemberForm(m)} className="text-indigo-500 hover:text-indigo-700 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                      <button type="button" aria-label={`Remove ${m.name}`} onClick={() => setHousehold(household.filter((x) => x.id !== m.id))} className="text-rose-500 hover:text-rose-700 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span>
                    <span className="font-bold text-slate-800 block">I am a working student</span>
                    <span className="text-[11px] text-slate-500">Turn on if you earn your own income while studying.</span>
                  </span>
                  <input type="checkbox" role="switch" checked={isWorkingStudent} onChange={(e) => { setIsWorkingStudent(e.target.checked); if (!e.target.checked) setStudentIncome(''); }} className="w-5 h-5" />
                </label>
                {isWorkingStudent && (
                  <div className="max-w-xs">
                    <label htmlFor="stu-inc" className="block font-bold text-slate-700 mb-1">Your gross annual income (₱)</label>
                    <input id="stu-inc" inputMode="numeric" value={studentIncome} onChange={(e) => setStudentIncome(digits(e.target.value) ? Number(digits(e.target.value)).toLocaleString('en-US') : '')} className={`${field} font-bold`} />
                  </div>
                )}
              </div>

              <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${incomeExceeded ? 'bg-rose-50 border-rose-300' : 'bg-indigo-50 border-indigo-200'}`}>
                <div>
                  <p className="font-bold text-slate-900">Total gross annual family income: {peso(annualIncome)}</p>
                  <p className="text-[11px] text-slate-600">
                    Limit for this scholarship: {scholarship.max_family_income > 0 ? peso(scholarship.max_family_income) : 'none'}.
                    {annualIncome < INDIGENCY_THRESHOLD && ' Because this is below ₱150,000, you will also upload a barangay Certificate of Indigency.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — screening questions */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Screening questions — {scholarship.category} scholarship</h3>
                <p className="text-slate-500 mt-0.5">Your answers are checked against the proof you upload next. Some answers add a document to your checklist.</p>
              </div>
              {questions.map((q) => {
                const v = answers[q.id] || '';
                const set = (val: string) => setAnswers({ ...answers, [q.id]: val });
                const bad = q.disqualifyingAnswer && v === q.disqualifyingAnswer.answer;
                return (
                  <div key={q.id} className="space-y-1.5">
                    <label htmlFor={`q-${q.id}`} className="block font-bold text-slate-800">{q.label}</label>
                    {q.type === 'yesno' ? (
                      <div id={`q-${q.id}`} role="radiogroup" className="flex gap-2">
                        {['Yes', 'No'].map((o) => (
                          <button key={o} type="button" role="radio" aria-checked={v === o} onClick={() => set(o)} className={`px-4 py-2 rounded-lg border font-bold cursor-pointer ${v === o ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300 text-slate-700'}`}>{o}</button>
                        ))}
                      </div>
                    ) : q.type === 'select' ? (
                      <select id={`q-${q.id}`} value={v} onChange={(e) => set(e.target.value)} className={field}>
                        <option value="">Select an answer</option>
                        {q.options!.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : q.type === 'textarea' ? (
                      <textarea id={`q-${q.id}`} rows={4} value={v} maxLength={q.maxLength} onChange={(e) => set(e.target.value)} className={field} />
                    ) : (
                      <input id={`q-${q.id}`} type={q.type === 'number' ? 'number' : 'text'} min={q.min} value={v} maxLength={q.maxLength} onChange={(e) => set(e.target.value)} className={field} />
                    )}
                    {q.help && <p className="text-[11px] text-slate-500">{q.help}{q.type === 'textarea' && ` (${v.length} characters)`}</p>}
                    {bad && <p className="text-[11px] font-bold text-rose-600">{q.disqualifyingAnswer!.message}</p>}
                    {q.requiresDocument && v && (q.requiresDocument.whenAnswer === '*' || q.requiresDocument.whenAnswer === v) && (
                      <p className="text-[11px] text-indigo-700 flex items-center gap-1"><FileText className="w-3 h-3" />Added to your documents: {q.requiresDocument.label}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 4 — documents */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Documents</h3>
                  <p className="text-slate-500 mt-0.5">PDF, JPG or PNG, up to 10 MB each. You cannot submit until every item is uploaded.</p>
                </div>
                <span className={`font-bold px-3 py-1 rounded-lg ${uploadedCount === checklist.length ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                  {uploadedCount} of {checklist.length} uploaded
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-600" />
                <span>Files are saved under the university filename format <strong className="font-mono">{FILENAME_FORMAT_HINT}</strong> so staff can find and verify them. Your file is renamed automatically when you upload it.</span>
              </div>

              {(['Scholarship requirement', 'Family income', 'Supporting proof'] as const).map((group) => {
                const items = checklist.filter((c) => c.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="space-y-3">
                    <h4 className="font-bold text-slate-800">{group === 'Scholarship requirement' ? 'Required by this scholarship' : group === 'Family income' ? 'Proof of family income' : 'Proof required for this type of scholarship'}</h4>
                    {items.map((c) => (
                      <DocumentUploader
                        key={c.key}
                        type={c.code === 'COE' ? 'com' : c.code.startsWith('ITR') ? 'itr' : 'other'}
                        title={c.label}
                        subtitle={`${c.why ? c.why + ' · ' : ''}Saved as ${standardFileName(record.student_number, record.last_name, c.code, 'file.pdf').replace('.pdf', '.<ext>')}`}
                        required
                        document={docs[c.key] || null}
                        onDocumentChange={(d) => setDoc(c.key, c.code, c.label, d)}
                        onPreviewRequest={(d) => setPreviewDoc(d)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 5 — review */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-900">Review and submit</h3>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div><span className="text-[10px] text-slate-500 font-bold block">Applicant</span><span className="font-bold">{studentFullName(record)}</span></div>
                <div><span className="text-[10px] text-slate-500 font-bold block">Student number</span><span className="font-mono font-bold">{record.student_number}</span></div>
                <div><span className="text-[10px] text-slate-500 font-bold block">Program & year</span>{record.program}, {record.year_level}</div>
                <div><span className="text-[10px] text-slate-500 font-bold block">GWA (Registrar)</span><span className="font-bold">{record.gwa.toFixed(2)}</span></div>
                <div><span className="text-[10px] text-slate-500 font-bold block">Family income</span><span className="font-bold">{peso(annualIncome)} / yr</span> <span className="text-slate-500">({household.length} member{household.length === 1 ? '' : 's'}{isWorkingStudent ? ' + you' : ''})</span></div>
                <div><span className="text-[10px] text-slate-500 font-bold block">Mobile</span>{phone}</div>
              </div>

              {questions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-800">Screening answers</p>
                  {questions.map((q) => (
                    <p key={q.id} className="text-slate-700"><span className="text-slate-500">{q.label}</span> — <strong>{answers[q.id]}</strong></p>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <p className="font-bold text-slate-800">Documents ({uploadedCount} of {checklist.length})</p>
                {checklist.map((c) => (
                  <div key={c.key} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {docs[c.key] ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
                      <span className="min-w-0">
                        <span className="font-semibold text-slate-800 block">{c.label}</span>
                        <span className="font-mono text-[10px] text-slate-500 truncate block">{docs[c.key]?.name || 'Missing'}</span>
                      </span>
                    </div>
                    {docs[c.key] && (
                      <button type="button" onClick={() => setPreviewDoc(docs[c.key])} className="font-bold text-indigo-600 flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-lg cursor-pointer">
                        <Eye className="w-3 h-3" />View
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2.5 bg-white p-4 rounded-xl border border-slate-200 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
                <span className="text-slate-700 leading-relaxed">
                  I certify that my answers and documents are true and complete. I understand that false information cancels my application or grant, and I allow the scholarship office to verify my records with the Registrar. My data is processed under the Data Privacy Act of 2012.
                </span>
              </label>
            </div>
          )}

          {/* STEP 6 — confirmation */}
          {step === 6 && createdApp && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><Sparkles className="w-8 h-8" /></div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Application submitted</h3>
                <p className="text-slate-600 max-w-md mx-auto mt-1">You can follow its progress any time under My Applications. We will also use {phone} for updates.</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 max-w-sm mx-auto">
                <span className="font-bold text-slate-500 block">Reference number</span>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="text-2xl font-black font-mono text-indigo-600 tracking-widest select-all">{createdApp.reference_code}</span>
                  <button
                    type="button"
                    aria-label="Copy reference number"
                    onClick={() => { navigator.clipboard.writeText(createdApp.reference_code); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && <p className="text-[11px] font-bold text-emerald-600 mt-1">Copied</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button type="button" onClick={() => { onTrackExisting?.(createdApp.reference_code); onClose(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer">
                  <Clock className="w-4 h-4" />Go to My Applications
                </button>
                <button type="button" onClick={onClose} className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold py-3 px-6 rounded-xl cursor-pointer">Close</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer: errors sit right beside the button that caused them */}
        {step <= 5 && (
          <div className="bg-slate-100 p-4 border-t border-slate-200 space-y-3">
            {error && (
              <div role="alert" className="bg-rose-50 text-rose-800 px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              {step > 1 ? (
                <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-4 py-2.5 rounded-xl border border-slate-300 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />Back
                </button>
              ) : <span />}
              {step < 5 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={step === 1 && (duplicate.isDuplicate || !eligibility.eligible)}
                  className="flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 rounded-xl text-white bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Continue to {visibleSteps[stepPos]?.toLowerCase()}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-xs font-bold px-6 py-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'Submitting…' : isRenewal ? 'Submit renewal' : 'Submit application'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {previewDoc && (
        <DocumentViewerModal document={previewDoc} studentName={studentFullName(record)} studentNumber={record.student_number} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
};
