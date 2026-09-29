/**
 * ScholarFlow — scholarship rules shared by the student application form and the staff review.
 *
 *  - Program / year-level eligibility and per-program application quotas
 *  - Program-specific screening questions that validate what the student claims
 *  - The document checklist (base requirements + conditional proofs such as family income)
 *  - The standard filename every uploaded document is saved under
 */
import { Application, HouseholdMember, Scholarship, ScholarshipCategory } from '../types';

// ---------------------------------------------------------------------------
// Eligibility & quotas
// ---------------------------------------------------------------------------

/** Statuses that hold a slot. Rejected, Removed and Expired applications free the slot again. */
export const SLOT_HOLDING_STATUSES = ['Pending', 'In Review', 'Shortlisted', 'For Approval', 'Approved', 'For Renewal'];

export function isOpenToAllPrograms(s: Scholarship): boolean {
  return !s.eligible_programs || s.eligible_programs.length === 0;
}

export function programQuotaFor(s: Scholarship, program: string): number | null {
  if (!s.program_quotas) return null;
  const q = s.program_quotas[program];
  return typeof q === 'number' ? q : null;
}

export function programSlotsUsed(s: Scholarship, program: string, applications: Application[]): number {
  return applications.filter(
    (a) =>
      (a.scholarship_id === s.id || a.scholarship_title === s.title) &&
      a.program === program &&
      SLOT_HOLDING_STATUSES.includes(a.status)
  ).length;
}

export interface EligibilityResult {
  eligible: boolean;
  /** Plain-language reasons the student cannot apply (empty when eligible). */
  reasons: string[];
  programQuota: number | null;
  programSlotsLeft: number | null;
}

export function checkEligibility(
  s: Scholarship,
  student: { program?: string; year_level?: string; gwa?: number },
  applications: Application[]
): EligibilityResult {
  const reasons: string[] = [];
  const program = student.program || '';

  if (!isOpenToAllPrograms(s) && !s.eligible_programs!.includes(program)) {
    reasons.push(`Only open to ${s.eligible_programs!.join(', ')} students. Your program (${program || 'not on record'}) is not covered.`);
  }
  if (s.eligible_year_levels && s.eligible_year_levels.length > 0 && student.year_level && !s.eligible_year_levels.includes(student.year_level)) {
    reasons.push(`Only open to ${s.eligible_year_levels.join(', ')} students. You are in ${student.year_level}.`);
  }
  if (typeof student.gwa === 'number' && s.min_gwa > 0 && student.gwa > s.min_gwa) {
    reasons.push(`Requires a GWA of ${s.min_gwa.toFixed(2)} or better. Your Registrar GWA is ${student.gwa.toFixed(2)}.`);
  }

  const quota = programQuotaFor(s, program);
  let left: number | null = null;
  if (quota !== null) {
    left = Math.max(0, quota - programSlotsUsed(s, program, applications));
    if (left === 0) reasons.push(`All ${quota} application slots for ${program} are taken.`);
  } else if (s.slots_remaining <= 0) {
    reasons.push('All application slots for this scholarship are taken.');
  }

  return { eligible: reasons.length === 0, reasons, programQuota: quota, programSlotsLeft: left };
}

// ---------------------------------------------------------------------------
// Screening questions (specific to each scholarship type)
// ---------------------------------------------------------------------------

export interface ScreeningQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'yesno' | 'number' | 'url';
  options?: string[];
  help?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  /** An answer that makes the applicant ineligible, with the message shown to them. */
  disqualifyingAnswer?: { answer: string; message: string };
  /** A document that becomes required when the question has this answer ('*' = any answer). */
  requiresDocument?: { whenAnswer: string; label: string; code: string };
}

export const SCREENING_QUESTIONS: Record<ScholarshipCategory, ScreeningQuestion[]> = {
  Academic: [
    { id: 'honors', label: "Dean's List standing last semester", type: 'select', options: ["Dean's List — 1st Honors", "Dean's List — 2nd Honors", "Not on the Dean's List"] },
    { id: 'failing_grade', label: 'Have you received a failing, dropped or incomplete (INC) grade in any semester?', type: 'yesno', disqualifyingAnswer: { answer: 'Yes', message: 'Academic scholarships require a clean record with no failing, dropped or INC grades.' } },
    { id: 'disciplinary', label: 'Do you have a pending or past disciplinary case with the Office of Student Affairs?', type: 'yesno', disqualifyingAnswer: { answer: 'Yes', message: 'Applicants with disciplinary records are not eligible for academic scholarships.' } },
  ],
  Financial: [
    { id: 'fourps', label: 'Is your household a 4Ps (Pantawid Pamilyang Pilipino Program) beneficiary?', type: 'yesno', requiresDocument: { whenAnswer: 'Yes', label: '4Ps beneficiary ID or DSWD certification', code: '4PS' } },
    { id: 'other_aid', label: 'Are you currently receiving another scholarship or financial assistance (e.g. CHED, DOST, LGU)?', type: 'yesno', requiresDocument: { whenAnswer: 'Yes', label: 'Award letter of your other scholarship (shows amount and coverage)', code: 'OTHER-AID' } },
    { id: 'need_statement', label: "Describe your family's current financial situation", type: 'textarea', minLength: 80, maxLength: 800, help: 'At least 80 characters. Mention events such as job loss, illness or calamity if they apply.' },
  ],
  Athletic: [
    { id: 'sport', label: 'Sport', type: 'select', options: ['Basketball', 'Volleyball', 'Football', 'Swimming', 'Athletics (Track & Field)', 'Badminton', 'Table Tennis', 'Taekwondo', 'Chess'] },
    { id: 'team_status', label: 'Current team status', type: 'select', options: ['Varsity — starting line-up', 'Varsity — reserve', 'Training pool'], disqualifyingAnswer: { answer: 'Training pool', message: 'Athletic grants are limited to rostered varsity players.' } },
    { id: 'coach', label: "Head coach's name", type: 'text', maxLength: 80, requiresDocument: { whenAnswer: '*', label: 'Varsity roster certification signed by the Athletics Director', code: 'VARSITY' } },
  ],
  Leadership: [
    { id: 'org_name', label: 'Recognized student organization', type: 'text', maxLength: 120 },
    { id: 'org_position', label: 'Position held', type: 'select', options: ['President / Chairperson', 'Vice President', 'Secretary', 'Treasurer', 'Committee Head', 'Council Representative'] },
    { id: 'term_served', label: 'Term served', type: 'select', options: ['A.Y. 2025–2026', 'A.Y. 2026–2027'], requiresDocument: { whenAnswer: '*', label: 'Certificate of officership signed by the Office of Student Affairs', code: 'OFFICER' } },
  ],
  Research: [
    { id: 'research_title', label: 'Research / thesis title', type: 'text', maxLength: 200 },
    { id: 'adviser', label: 'Research adviser', type: 'text', maxLength: 80 },
    { id: 'research_stage', label: 'Current stage', type: 'select', options: ['Proposal approved by panel', 'Data gathering', 'Writing results'], requiresDocument: { whenAnswer: '*', label: 'Endorsement letter from your research adviser', code: 'ADVISER' } },
  ],
  Community: [
    { id: 'org_name', label: 'Community organization or project', type: 'text', maxLength: 120 },
    { id: 'service_hours', label: 'Verified service hours in the last 12 months', type: 'number', min: 40, help: 'Minimum 40 hours.', requiresDocument: { whenAnswer: '*', label: 'Certificate of community service hours from the partner organization', code: 'SERVICE' } },
  ],
  Alumni: [
    { id: 'alumnus_name', label: 'Full name of your Meridian alumnus parent or guardian', type: 'text', maxLength: 100 },
    { id: 'alumnus_relation', label: 'Relationship', type: 'select', options: ['Father', 'Mother', 'Legal guardian'] },
    { id: 'alumnus_grad_year', label: 'Year they graduated from Meridian', type: 'number', min: 1960, requiresDocument: { whenAnswer: '*', label: "Parent's Meridian diploma or alumni ID", code: 'ALUMNI' } },
  ],
  Industry: [
    { id: 'portfolio_url', label: 'Portfolio or GitHub link', type: 'url', maxLength: 200, help: 'Must start with https://' },
    { id: 'return_service', label: "Do you agree to the sponsor's one-year return-service agreement after graduation?", type: 'yesno', disqualifyingAnswer: { answer: 'No', message: 'Industry-sponsored grants require the return-service agreement.' } },
  ],
  'Performing Arts': [
    { id: 'ensemble', label: 'University ensemble', type: 'select', options: ['Meridian Chorale', 'Meridian Dance Company', 'Theater Guild', 'Symphonic Band'], requiresDocument: { whenAnswer: '*', label: 'Membership certification from the Culture & Arts Office', code: 'ENSEMBLE' } },
  ],
};

export function screeningQuestionsFor(s: Scholarship): ScreeningQuestion[] {
  return SCREENING_QUESTIONS[s.category] || [];
}

export function validateScreeningAnswers(s: Scholarship, answers: Record<string, string>): string | null {
  for (const q of screeningQuestionsFor(s)) {
    const a = (answers[q.id] || '').trim();
    if (!a) return `Please answer: "${q.label}".`;
    if (q.minLength && a.length < q.minLength) return `"${q.label}" needs at least ${q.minLength} characters (you have ${a.length}).`;
    if (q.type === 'number' && q.min !== undefined && Number(a) < q.min) return `"${q.label}" must be at least ${q.min}.`;
    if (q.type === 'url' && !/^https:\/\/[^\s.]+\.[^\s]+$/.test(a)) return `"${q.label}" must be a valid link starting with https://`;
    if (q.disqualifyingAnswer && a === q.disqualifyingAnswer.answer) return q.disqualifyingAnswer.message;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Household income rules
// ---------------------------------------------------------------------------

export const EARNING_STATUSES = ['Employed', 'Self-employed', 'OFW', 'Pensioner'] as const;
export const HOUSEHOLD_STATUSES = [...EARNING_STATUSES, 'Unemployed'] as const;

/** Smallest annual income a member marked as earning may declare. Anything lower should be declared as "Unemployed". */
export const MIN_DECLARED_ANNUAL_INCOME = 12000;

/** Below this total, the applicant must also submit a barangay Certificate of Indigency. */
export const INDIGENCY_THRESHOLD = 150000;

export function memberEarns(m: HouseholdMember): boolean {
  if (m.employment_status) return m.employment_status !== 'Unemployed';
  const inc = m.annual_income !== undefined ? m.annual_income : (m.monthly_income || 0) * 12;
  return inc > 0;
}

export function memberAnnualIncome(m: HouseholdMember): number {
  return m.annual_income !== undefined ? Number(m.annual_income) || 0 : (Number(m.monthly_income) || 0) * 12;
}

// ---------------------------------------------------------------------------
// Document checklist
// ---------------------------------------------------------------------------

export interface RequiredDocument {
  key: string; // stable key used to match uploads to requirements
  label: string;
  code: string; // used in the filename
  why?: string;
  group: 'Scholarship requirement' | 'Family income' | 'Supporting proof';
}

export function codeForRequirement(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('enrol')) return 'COE';
  if (l.includes('transcript') || l.includes('grades') || l.includes('tcg')) return 'GRADES';
  if (l.includes('good conduct') || l.includes('good moral')) return 'GOODMORAL';
  if (l.includes('indigency')) return 'INDIGENCY';
  if (l.includes('utility') || l.includes('billing')) return 'UTILITY';
  if (l.includes('income') || l.includes('tax')) return 'ITR';
  if (l.includes('recommendation')) return 'RECOMMENDATION';
  if (l.includes('endorse')) return 'ENDORSEMENT';
  if (l.includes('portfolio') || l.includes('github')) return 'PORTFOLIO';
  if (l.includes('statement') || l.includes('essay')) return 'ESSAY';
  if (l.includes('leadership') || l.includes('advocacy')) return 'LEADERSHIP';
  if (l.includes('employment')) return 'COEMP';
  if (l.includes('id')) return 'ID';
  return label
    .replace(/[^A-Za-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('') || 'DOC';
}

export function buildDocumentChecklist(
  s: Scholarship,
  household: HouseholdMember[],
  opts: { isWorkingStudent: boolean; annualFamilyIncome: number; answers: Record<string, string> }
): RequiredDocument[] {
  const list: RequiredDocument[] = [];

  (s.requirements || []).forEach((req, i) => {
    list.push({ key: `req-${i}`, label: req, code: codeForRequirement(req), group: 'Scholarship requirement' });
  });

  const relationCount: Record<string, number> = {};
  household.forEach((m) => {
    const rel = (m.relation || 'Member').toUpperCase().replace(/[^A-Z]/g, '');
    relationCount[rel] = (relationCount[rel] || 0) + 1;
    const suffix = relationCount[rel] > 1 ? `-${relationCount[rel]}` : '';
    const who = `${m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim()} (${m.relation})`;
    if (memberEarns(m)) {
      list.push({
        key: `income-${m.id}`,
        label: `Proof of income — ${who}`,
        code: `ITR-${rel}${suffix}`,
        why: m.employment_status === 'OFW'
          ? 'Latest POEA/DMW employment contract or remittance summary'
          : m.employment_status === 'Pensioner'
          ? 'Latest SSS/GSIS pension statement'
          : m.employment_status === 'Self-employed'
          ? 'Latest ITR (BIR 1701) or DTI business permit with income declaration'
          : 'BIR Form 2316 or latest ITR, or 3 most recent payslips',
        group: 'Family income',
      });
    } else if (m.relation !== 'Sibling') {
      list.push({
        key: `noincome-${m.id}`,
        label: `Certificate of no income — ${who}`,
        code: `NOINCOME-${rel}${suffix}`,
        why: 'Barangay certification or BIR Certificate of Tax Exemption',
        group: 'Family income',
      });
    }
  });

  if (opts.isWorkingStudent) {
    list.push({ key: 'student-employment', label: 'Certificate of employment with compensation (applicant)', code: 'COEMP-SELF', group: 'Family income' });
  }

  const alreadyHasIndigency = list.some((d) => d.code === 'INDIGENCY');
  if (opts.annualFamilyIncome < INDIGENCY_THRESHOLD && !alreadyHasIndigency) {
    list.push({
      key: 'indigency',
      label: 'Certificate of Indigency from your barangay',
      code: 'INDIGENCY',
      why: `Required because your declared family income is below ₱${INDIGENCY_THRESHOLD.toLocaleString()} a year.`,
      group: 'Family income',
    });
  }

  screeningQuestionsFor(s).forEach((q) => {
    const a = (opts.answers[q.id] || '').trim();
    if (q.requiresDocument && a && (q.requiresDocument.whenAnswer === '*' || q.requiresDocument.whenAnswer === a)) {
      list.push({ key: `screen-${q.id}`, label: q.requiresDocument.label, code: q.requiresDocument.code, group: 'Supporting proof' });
    }
  });

  return list;
}

// ---------------------------------------------------------------------------
// Standard filename
// ---------------------------------------------------------------------------

export const FILENAME_FORMAT_HINT = 'StudentNo_LASTNAME_DOCUMENT.ext — e.g. 2023104821_VANCE_COE.pdf';

export function standardFileName(studentNumber: string, lastName: string, code: string, originalName: string): string {
  const ext = (originalName.split('.').pop() || 'pdf').toLowerCase();
  const last = (lastName || 'APPLICANT').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');
  return `${studentNumber}_${last}_${code}.${ext}`;
}
