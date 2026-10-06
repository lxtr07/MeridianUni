import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Award, Users, RefreshCw, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { Scholarship, ScholarshipCategory } from '../../types';

interface ScholarshipModalProps {
  scholarshipToEdit?: Scholarship | null;
  onClose: () => void;
  onSave: (scholarship: Scholarship) => void;
}

export const ScholarshipModal: React.FC<ScholarshipModalProps> = ({
  scholarshipToEdit,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(scholarshipToEdit?.title || '');
  // Code is always system-generated: MU-<category prefix>-<year>-<4 random hex>
  const generateCode = (cat: string) => {
    const prefix: Record<string, string> = { Academic: 'PAEF', Financial: 'GANB', Athletic: 'VAG', Leadership: 'CLF', Research: 'URIG', Industry: 'IND', Community: 'CSI', Alumni: 'ALE', 'Performing Arts': 'PA' };
    const suffix = (pre: string) => `MU-${pre}-${new Date().getFullYear()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
    return suffix(prefix[cat] || 'SCH');
  };
  const [code] = useState(scholarshipToEdit?.code || generateCode(scholarshipToEdit?.category || 'Academic'));
  const [category, setCategory] = useState<ScholarshipCategory>(scholarshipToEdit?.category || 'Academic');
  const [description, setDescription] = useState(scholarshipToEdit?.description || '');
  const occupiedSlots = scholarshipToEdit
    ? Math.max(0, scholarshipToEdit.slots - scholarshipToEdit.slots_remaining)
    : 0;
  const [slots, setSlots] = useState<number | ''>(scholarshipToEdit?.slots || 20);
  const [grantAmount, setGrantAmount] = useState<number | ''>(scholarshipToEdit?.grant_amount || 50000);
  const [grantType, setGrantType] = useState(scholarshipToEdit?.grant_type || '100% Tuition Discount');
  const [minGwa, setMinGwa] = useState<string>(scholarshipToEdit?.min_gwa ? String(scholarshipToEdit.min_gwa) : '1.75');
  const [maxFamilyIncome, setMaxFamilyIncome] = useState<string>(scholarshipToEdit?.max_family_income ? Number(scholarshipToEdit.max_family_income).toLocaleString('en-US') : '500,000');
  const [deadline, setDeadline] = useState(scholarshipToEdit?.deadline || '2026-10-30');
  const [requirementsStr, setRequirementsStr] = useState(scholarshipToEdit?.requirements.join('\n') || 'Certificate of Matriculation\nITR / Indigency Certificate\nOfficial Student ID');

  // Policy Rules
  const [durationYears, setDurationYears] = useState<number | ''>(scholarshipToEdit?.duration_years ?? 1);
  const [isRenewable, setIsRenewable] = useState<boolean>(scholarshipToEdit?.is_renewable ?? false);
  const [renewalDeadline, setRenewalDeadline] = useState(scholarshipToEdit?.renewal_deadline || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keyboard accessibility: Escape key dismisses modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const computeScholarshipExpirationDate = (baseDeadline: string, years: number | string) => {
    if (!baseDeadline) return '';
    try {
      const d = new Date(baseDeadline);
      if (isNaN(d.getTime())) return '';
      const numYears = Math.max(1, Number(years) || 1);
      d.setFullYear(d.getFullYear() + numYears);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimal = false) => {
    if (['e', 'E', 'g', 'G', '+', '-'].includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (!allowDecimal && e.key === '.') {
      e.preventDefault();
      return;
    }
  };

  // Clear is always available regardless of what is filled

  const handleClear = () => {
    setTitle('');
    setDescription('');
    setGrantAmount('');
    setSlots('');
    setMinGwa('');
    setMaxFamilyIncome('');
    setRequirementsStr('');
    setErrorMsg(null);
  };

  const handleReset = () => {
    setTitle(scholarshipToEdit?.title || '');
    // code is auto-generated, not reset
    setCategory(scholarshipToEdit?.category || 'Academic');
    setDescription(scholarshipToEdit?.description || '');
    setSlots(scholarshipToEdit?.slots || 20);
    setGrantAmount(scholarshipToEdit?.grant_amount || 50000);
    setGrantType(scholarshipToEdit?.grant_type || '100% Tuition Discount');
    setMinGwa(scholarshipToEdit?.min_gwa ? String(scholarshipToEdit.min_gwa) : '1.75');
    setMaxFamilyIncome(scholarshipToEdit?.max_family_income ? Number(scholarshipToEdit.max_family_income).toLocaleString('en-US') : '500,000');
    setDeadline(scholarshipToEdit?.deadline || '2026-10-30');
    setRequirementsStr(scholarshipToEdit?.requirements.join('\n') || 'Certificate of Matriculation\nITR / Indigency Certificate\nOfficial Student ID');
    setDurationYears(scholarshipToEdit?.duration_years ?? 1);
    setIsRenewable(scholarshipToEdit?.is_renewable ?? false);
    setRenewalDeadline(scholarshipToEdit?.renewal_deadline || '');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please enter a scholarship title.');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('Please enter a program code.');
      return;
    }
    if (!category) {
      setErrorMsg('Please select a category.');
      return;
    }
    if (!grantType.trim()) {
      setErrorMsg('Please enter the grant benefit type.');
      return;
    }
    if (grantAmount === '' || Number(grantAmount) <= 0) {
      setErrorMsg('Please enter a valid grant value.');
      return;
    }
    if (slots === '' || Number(slots) <= 0) {
      setErrorMsg('Please enter total available slots.');
      return;
    }
    const gwaNum = Number(minGwa);
    if (!minGwa.trim() || isNaN(gwaNum) || gwaNum < 1.0 || gwaNum > 5.0) {
      setErrorMsg('Minimum GWA must be between 1.00 and 5.00.');
      return;
    }
    if (!maxFamilyIncome.trim()) {
      setErrorMsg('Please enter the maximum annual family income.');
      return;
    }
    if (!deadline.trim()) {
      setErrorMsg('Please select an application deadline.');
      return;
    }
    const todayStr = getTodayDateString();
    if (deadline < todayStr) {
      setErrorMsg('Application deadline must be a future date. Past dates are strictly prevented.');
      return;
    }

    const reqList = requirementsStr
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);
    if (reqList.length === 0) {
      setErrorMsg('Please enter at least one required document.');
      return;
    }

    if (durationYears === '' || Number(durationYears) <= 0) {
      setErrorMsg('Please enter the duration in school years.');
      return;
    }
    const estimatedExpirationDate = computeScholarshipExpirationDate(deadline, durationYears);

    if (isRenewable && !renewalDeadline.trim()) {
      setErrorMsg('Please select a renewal submission deadline.');
      return;
    }
    if (isRenewable && renewalDeadline.trim()) {
      if (renewalDeadline < todayStr) {
        setErrorMsg('Renewal deadline must be a future date. Past dates are strictly prevented.');
        return;
      }
      if (estimatedExpirationDate && renewalDeadline < estimatedExpirationDate) {
        setErrorMsg(`Renewal Deadline cannot be set prior to the scholarship expiration date (${estimatedExpirationDate}). Under university regulations, renewal can only occur after the active award duration concludes.`);
        return;
      }
    }

    const cleanIncome = Number(String(maxFamilyIncome).replace(/,/g, '')) || 0;

    const schObj: Scholarship = {
      id: scholarshipToEdit?.id || `sch-${Date.now()}`,
      title: title.trim(),
      code: code.trim(),
      category,
      description: description.trim(),
      slots: Number(slots) || 1,
      slots_remaining: Math.max(0, (Number(slots) || 1) - occupiedSlots),
      grant_amount: Number(grantAmount) || 0,
      grant_type: grantType.trim(),
      min_gwa: gwaNum,
      max_family_income: cleanIncome,
      deadline,
      requirements: reqList,
      is_active: true,
      is_frozen: scholarshipToEdit?.is_frozen || false,
      created_at: scholarshipToEdit?.created_at || new Date().toISOString(),
      // Policy Rules: Global 1-per-student limit hardcoded
      duration_years: Number(durationYears) || 1,
      is_renewable: isRenewable,
      renewal_deadline: isRenewable && renewalDeadline ? renewalDeadline : undefined,
      max_approved_per_student: 1,
    };

    onSave(schObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              {scholarshipToEdit ? 'Edit Scholarship Program' : 'Add New Scholarship Program'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 text-rose-800 px-6 py-3 border-b border-rose-200 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">

          {/* Basic Information */}
          <div>
            {/* Form Top Controls: Reset & Clear */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                Basic Information
              </span>
            <div className="flex items-center space-x-2">
              
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 cursor-pointer border border-rose-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Scholarship Title *</label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder="e.g. Academic Excellence Scholarship"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Program Code</label>
                <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 flex items-center gap-1.5">
                  <span className="text-slate-400">🔒</span>
                  <span>{code}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Auto-generated by the system based on category.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category *</label>
                <select
                  required
                  value={category}
                  onChange={e => { setCategory(e.target.value as ScholarshipCategory); }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="Academic">Academic</option>
                  <option value="Financial">Financial</option>
                  <option value="Athletic">Athletic</option>
                  <option value="Performing Arts">Performing Arts</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Industry">Industry</option>
                  <option value="Leadership">Leadership</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Grant Benefit Type *</label>
                <select
                  required
                  value={grantType}
                  onChange={e => setGrantType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="">Select a benefit type</option>
                  <option value="100% Tuition Waiver">100% Tuition Waiver</option>
                  <option value="50% Tuition Discount">50% Tuition Discount</option>
                  <option value="Full Tuition + Monthly Stipend">Full Tuition + Monthly Stipend</option>
                  <option value="Tuition Credit (₱ Amount)">Tuition Credit (₱ Amount)</option>
                  <option value="Tuition + Book &amp; Supplies Allowance">Tuition + Book &amp; Supplies Allowance</option>
                  <option value="Tuition + Meal Allowance">Tuition + Meal Allowance</option>
                  <option value="Research Materials Fund">Research Materials Fund</option>
                  <option value="Paid Internship + Tuition Credit">Paid Internship + Tuition Credit</option>
                  <option value="Tuition + Training Allowance">Tuition + Training Allowance</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block font-bold text-slate-700 mb-1">
                Program Description <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                maxLength={500}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Grant & Eligibility */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-3">Grant &amp; Eligibility</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Grant Value (₱) *</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="e.g. 50,000"
                  value={grantAmount !== '' ? Number(grantAmount).toLocaleString('en-US') : ''}
                  onKeyDown={(e) => handleNumericKeyDown(e, false)}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setGrantAmount(raw ? parseInt(raw, 10) : '');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {grantType === '100% Tuition Waiver' || grantType === '50% Tuition Discount'
                    ? 'Enter the peso equivalent of the tuition waiver or discount (e.g. ₱45,000 per semester).'
                    : grantType === 'Tuition Credit (₱ Amount)'
                    ? 'Enter the exact amount credited to the student account each semester.'
                    : 'Enter the total peso value of the benefit per semester.'}
                </p>
              </div>
              <div>
                <label className="flex items-center justify-between font-bold text-slate-700 mb-1">
                  <span>Total Slots *</span>
                  {occupiedSlots > 0 && (
                    <span className="text-[11px] font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {occupiedSlots} applied
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="20"
                  value={slots}
                  onKeyDown={(e) => handleNumericKeyDown(e, false)}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setSlots(raw ? parseInt(raw, 10) : '');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Min GWA (1.00-5.00) *</label>
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  placeholder="1.75"
                  value={minGwa}
                  onKeyDown={(e) => handleNumericKeyDown(e, true)}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                      setMinGwa(val);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Annual Income (₱) *</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="500,000"
                  value={maxFamilyIncome}
                  onKeyDown={(e) => handleNumericKeyDown(e, false)}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setMaxFamilyIncome(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block font-bold text-slate-700 mb-1">Application Deadline *</label>
              <input
                type="date"
                required
                min={getTodayDateString()}
                value={deadline}
                onChange={e => {
                  const val = e.target.value;
                  const today = getTodayDateString();
                  setDeadline(val);
                  if (val && val < today) {
                    setErrorMsg('Application deadline cannot be a past date. Please select a future date.');
                  } else {
                    setErrorMsg(null);
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>

            <div className="mt-3 space-y-2">
              <label className="block font-bold text-slate-700">Required Documents *</label>
              <p className="text-[11px] text-slate-500">Pick from the list below. You can also type a custom document at the bottom.</p>

              {/* Ticked checklist of standard documents */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {[
                  "Certificate of Enrollment",
                  "Certified True Copy of Grades (previous semester)",
                  "Certificate of Good Moral Character",
                  "Barangay Certificate of Indigency",
                  "BIR Form 2316 / ITR (parent or guardian)",
                  "Proof of income for all earning household members",
                  "Utility billing statement (last 3 months)",
                  "Passport-size photo (2x2)",
                  "PSA Birth Certificate",
                  "Medical clearance from the University Clinic",
                  "Faculty / adviser recommendation letter",
                  "Varsity roster certification (signed by Athletics Director)",
                  "Officer certification (signed by Office of Student Affairs)",
                  "Research adviser endorsement letter",
                  "Approved research proposal",
                  "Portfolio or project summary (PDF)",
                  "Business case essay",
                  "Certificate of community service hours",
                  "Parent's Meridian diploma or alumni ID",
                  "4Ps beneficiary ID or DSWD certification",
                ].map((doc) => {
                  const checked = requirementsStr.split('\n').map(r => r.trim()).includes(doc);
                  return (
                    <label key={doc} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-white rounded-lg p-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = requirementsStr.split('\n').map(r => r.trim()).filter(Boolean);
                          const next = e.target.checked
                            ? [...current.filter(r => r !== doc), doc]
                            : current.filter(r => r !== doc);
                          setRequirementsStr(next.join('\n'));
                        }}
                        className="mt-0.5 shrink-0"
                      />
                      <span className={checked ? 'font-semibold text-slate-900' : 'text-slate-600'}>{doc}</span>
                    </label>
                  );
                })}
              </div>

              {/* Currently selected — shown as chips */}
              {requirementsStr.split('\n').filter(r => r.trim()).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {requirementsStr.split('\n').filter(r => r.trim()).map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      {r.trim()}
                      <button
                        type="button"
                        aria-label={`Remove ${r.trim()}`}
                        onClick={() => setRequirementsStr(requirementsStr.split('\n').filter(line => line.trim() !== r.trim()).join('\n'))}
                        className="text-indigo-400 hover:text-rose-600 cursor-pointer ml-0.5 font-bold"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Custom document input */}
              <div className="flex gap-2">
                <input
                  id="custom-doc-input"
                  type="text"
                  maxLength={120}
                  placeholder="Add a custom document not on the list above…"
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (!val) return;
                      const current = requirementsStr.split('\n').map(r => r.trim()).filter(Boolean);
                      if (!current.includes(val)) setRequirementsStr([...current, val].join('\n'));
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const inp = document.getElementById('custom-doc-input') as HTMLInputElement;
                    const val = inp?.value.trim();
                    if (!val) return;
                    const current = requirementsStr.split('\n').map(r => r.trim()).filter(Boolean);
                    if (!current.includes(val)) setRequirementsStr([...current, val].join('\n'));
                    if (inp) inp.value = '';
                  }}
                  className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 cursor-pointer whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Policy Rules Section */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Scholarship Policy Rules</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Maximum grant period (semesters) *</span>
                </label>
                <select
                  required
                  value={durationYears}
                  onChange={e => setDurationYears(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={1}>1 semester (one-time, non-renewable)</option>
                  <option value={2}>2 semesters (one school year)</option>
                  <option value={4}>4 semesters (two school years)</option>
                  <option value={6}>6 semesters (three school years)</option>
                  <option value={8}>8 semesters (four school years — full program)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Grants are awarded one semester at a time. This is the total number of semesters a student may receive the grant if they keep qualifying.
                </p>
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isRenewable}
                    onChange={e => setIsRenewable(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${isRenewable ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isRenewable ? 'translate-x-4' : ''}`} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Scholarship is Renewable</span>
                  </p>
                  <p className="text-[10px] text-slate-500">Scholars can apply for renewal after the grant term ends</p>
                </div>
              </label>
            </div>

            {isRenewable && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Renewal Submission Deadline *</label>
                {(() => {
                  const estimatedExpirationDate = computeScholarshipExpirationDate(deadline, durationYears);
                  return (
                    <>
                      <input
                        type="date"
                        required={isRenewable}
                        min={estimatedExpirationDate || getTodayDateString()}
                        value={renewalDeadline}
                        onChange={e => {
                          const val = e.target.value;
                          const today = getTodayDateString();
                          setRenewalDeadline(val);
                          if (val && val < today) {
                            setErrorMsg('Renewal deadline cannot be a past date. Please select a future date.');
                          } else if (val && estimatedExpirationDate && val < estimatedExpirationDate) {
                            setErrorMsg(`Renewal deadline cannot be set prior to the scholarship expiration date (${estimatedExpirationDate}).`);
                          } else {
                            setErrorMsg(null);
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Earliest allowed renewal deadline: <strong className="text-slate-700">{estimatedExpirationDate || 'N/A'}</strong> (calculated based on {durationYears || 1}-year grant tenure after application deadline {deadline || 'N/A'}).
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Save Program
            </button>
          </div>

        </form>

      </motion.div>
    </div>
  );
};
