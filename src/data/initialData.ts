import { Scholarship, Application, FreezePeriod, UserProfile, InterviewSchedule, StaffApplication, ApplicationDocument, UserRole } from '../types';
import { ACADEMIC_PROGRAMS, REGISTRAR_STUDENTS, HR_STAFF_DIRECTORY, staffFullName, studentFullName, findRegistrarStudent } from './universityRegistry';

/**
 * Seed data for the ScholarFlow demo database.
 *
 * Demo sign-in (hashes below are verified against these passwords):
 *   Scholarship Coordinator  coordinator@meridian.edu   ExamplePASS12!
 *   System Administrator     admin@meridian.edu         ExamplePASS12!
 *   Staff - Evaluator        staff@meridian.edu         ExamplePass1!
 *   Staff - Interviewer      interviewer@meridian.edu   ExamplePass1!
 *   Students                 none pre-activated: activate one of the 5 registry students (password of your choice)
 *
 * The old built-in passwords (staff123 / admin123) are retired; accounts still using them are
 * repaired automatically on load (see lib/seedRepair.ts).
 */

export const STAFF_PASSWORD_HASH = '950aea945ddf367b5d64d46d2b30d6e2ee5f9b0b76c6389f64a734674d9f8a33'; // ExamplePass1!
export const ADMIN_PASSWORD_HASH = '815cff66cc6adafc6d02fd4318009ca3917f36fc80b4e71297f157f7e22dc4af'; // ExamplePASS12!
export const COORDINATOR_PASSWORD_HASH = '815cff66cc6adafc6d02fd4318009ca3917f36fc80b4e71297f157f7e22dc4af'; // ExamplePASS12! (same demo password as the System Administrator)
export const STUDENT_PASSWORD_HASH = '6309c3623a783288275c6624e419b99c258772d2992d876831c60c4f2df54738'; // #100YearsMapua

/** Demo recovery answers (stored hashed): "san roque elementary school" / "batangas". */
const DEMO_SECURITY_QUESTIONS = [
  { question: 'What is the name of your first elementary school?', answer: '968bc07077a3376843e021f47d0adf9a1fa3462e430988c27ece2b25fdd56b4a' },
  { question: 'What city or municipality was your mother born in?', answer: '04bf83395752773c3143aa8105215c86db4fc71318a1ace86788f5b525eb10a5' },
];

// ---------------------------------------------------------------------------
// Staff & administrator accounts (built from the HR directory)
// ---------------------------------------------------------------------------

const staffAccount = (id: string, staffId: string, role: UserRole, created: string): UserProfile => {
  const hr = HR_STAFF_DIRECTORY.find((h) => h.staff_id === staffId)!;
  const passwordHash =
    role === 'system_admin' ? ADMIN_PASSWORD_HASH :
    role === 'coordinator'  ? COORDINATOR_PASSWORD_HASH :
    STAFF_PASSWORD_HASH;
  return {
    id,
    email: hr.email,
    password: passwordHash,
    full_name: staffFullName(hr),
    first_name: hr.first_name,
    middle_name: hr.middle_name,
    last_name: hr.last_name,
    role,
    university_id: hr.staff_id,
    department: hr.department,
    title: hr.position,
    phone: hr.mobile,
    security_questions: DEMO_SECURITY_QUESTIONS,
    security_questions_setup: true,
    created_at: created,
  };
};

// Staff Evaluator — Prof. Corazon V. Santos (staff@meridian.edu): reviews, verifies documents, shortlists, endorses
export const INITIAL_STAFF_USER: UserProfile = { ...staffAccount('usr-staff-001', '2015000118', 'staff', '2025-01-10T08:00:00Z'), staff_role: 'evaluator' };
// Staff Interviewer — Engr. Danilo M. Ramos (interviewer@meridian.edu): interviews only
export const INITIAL_INTERVIEWER_USER: UserProfile = { ...staffAccount('usr-interviewer-001', '2018000452', 'staff', '2025-01-10T08:00:00Z'), staff_role: 'interviewer' };
// Scholarship Coordinator — Prof. Benedict A. Luna (coordinator@meridian.edu): final approval
export const INITIAL_COORDINATOR_USER: UserProfile = staffAccount('usr-coordinator-001', '2019000874', 'coordinator', '2025-01-01T08:00:00Z');
// System Administrator — Dr. Raymond B. Miller (admin@meridian.edu): accounts, roles, security logs
export const INITIAL_SYSTEM_ADMIN_USER: UserProfile = staffAccount('usr-sysadmin-001', '2012000017', 'system_admin', '2025-01-01T08:00:00Z');
// Legacy export kept for anywhere that still imports INITIAL_ADMIN_USER.
export const INITIAL_ADMIN_USER = INITIAL_SYSTEM_ADMIN_USER;

export const INITIAL_FACULTY_ACCOUNTS: UserProfile[] = [
  INITIAL_STAFF_USER,
  INITIAL_INTERVIEWER_USER,
  INITIAL_COORDINATOR_USER,
  INITIAL_SYSTEM_ADMIN_USER,
];

// ---------------------------------------------------------------------------
// Student accounts — most students activate through the portal, but two demo
// accounts are pre-activated so testers can sign in immediately and see an
// approved grant without going through the full application flow.
// ---------------------------------------------------------------------------

const studentAccount = (sn: string, created: string): UserProfile => {
  const st = REGISTRAR_STUDENTS.find((r) => r.student_number === sn)!;
  return {
    id: `stu-${sn}`,
    email: st.email,
    password: STUDENT_PASSWORD_HASH,
    full_name: studentFullName(st),
    first_name: st.first_name,
    middle_name: st.middle_name,
    last_name: st.last_name,
    role: 'student' as const,
    university_id: sn,
    program: st.program,
    year_level: st.year_level,
    phone: st.mobile,
    security_questions_setup: true,
    created_at: created,
    updated_at: created,
  };
};

// No student is pre-activated: testers activate one of the registry students through Student Sign Up.
export const INITIAL_STUDENT_ACCOUNTS: UserProfile[] = [];

// ---------------------------------------------------------------------------
// Scholarships — every program is scoped to the university's own degree programs
// ---------------------------------------------------------------------------

const quotas = (programs: string[], each: number | number[]): Record<string, number> =>
  Object.fromEntries(programs.map((p, i) => [p, Array.isArray(each) ? each[i] : each]));
const sum = (q: Record<string, number>) => Object.values(q).reduce((a, b) => a + b, 0);

const COMPUTING = ['BS Computer Science', 'BS Information Technology', 'BS Software Engineering', 'BS Data Science & Analytics'];

type SeedScholarship = Omit<Scholarship, 'slots' | 'slots_remaining' | 'is_active' | 'is_frozen' | 'max_approved_per_student' | 'duration_years'> & { duration_years?: number };

const mk = (s: SeedScholarship): Scholarship => {
  const slots = s.program_quotas ? sum(s.program_quotas) : 10;
  return { duration_years: 1, ...s, slots, slots_remaining: slots, is_active: true, is_frozen: false, max_approved_per_student: 1 };
};

const ALL_Q = (n: number) => quotas(ACADEMIC_PROGRAMS, n);

export const INITIAL_SCHOLARSHIPS: Scholarship[] = [
  mk({
    id: 'sch-001', code: 'MU-PAEF-2026',
    title: 'Presidential Academic Excellence Fellowship',
    description: "The university's top merit award. Covers full tuition and miscellaneous fees plus a book allowance for students with a consistently outstanding GWA.",
    category: 'Academic', grant_amount: 90000, min_grant_amount: 45000,
    grant_type: 'Full tuition and miscellaneous fees + ₱10,000 book allowance, per semester',
    min_gwa: 1.5, max_family_income: 1200000, deadline: '2026-10-30',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Certificate of Good Moral Character', "Parents' latest ITR or BIR Form 2316"],
    eligible_programs: [], program_quotas: ALL_Q(2), eligible_year_levels: ['2nd Year', '3rd Year', '4th Year', '5th Year'],
    is_renewable: true, renewal_deadline: '2027-01-08', created_at: '2026-07-15T09:00:00Z',
  }),
  mk({
    id: 'sch-002', code: 'MU-FICG-2026',
    title: 'Future Innovators Computing Grant',
    description: 'Sponsored by Northwind Data Systems for computing students building real software, data or infrastructure projects.',
    category: 'Industry', grant_amount: 60000, min_grant_amount: 30000,
    grant_type: '₱60,000 tuition credit per semester + paid summer internship slot',
    min_gwa: 1.75, max_family_income: 950000, deadline: '2026-10-20',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Faculty Recommendation Letter', 'Project portfolio summary (PDF, max 3 pages)'],
    eligible_programs: COMPUTING, program_quotas: quotas(COMPUTING, 4),
    is_renewable: true, renewal_deadline: '2027-01-15', created_at: '2026-07-20T09:00:00Z',
  }),
  mk({
    id: 'sch-003', code: 'MU-GANB-2026',
    title: 'Global Access Need-Based Grant',
    description: 'Financial aid for students from low-income households so they can stay enrolled without interruption.',
    category: 'Financial', grant_amount: 40000, min_grant_amount: 20000,
    grant_type: '₱40,000 tuition assistance per semester',
    min_gwa: 2.5, max_family_income: 380000, deadline: '2026-11-06',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Household utility billing statements (last 3 months)', 'Personal statement (1 page)'],
    eligible_programs: [], program_quotas: ALL_Q(5),
    is_renewable: true, renewal_deadline: '2027-01-15', created_at: '2026-07-22T09:00:00Z',
  }),
  mk({
    id: 'sch-004', code: 'MU-CLF-2026',
    title: 'Civic Leadership Fellowship',
    description: 'For officers of recognized student organizations who lead projects that benefit the university or their community.',
    category: 'Leadership', grant_amount: 35000, min_grant_amount: 15000,
    grant_type: '₱35,000 tuition credit per semester',
    min_gwa: 2.0, max_family_income: 600000, deadline: '2026-10-16',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Letter of endorsement from your organization adviser'],
    eligible_programs: [], program_quotas: ALL_Q(2),
    is_renewable: false, created_at: '2026-07-25T09:00:00Z',
  }),
  mk({
    id: 'sch-005', code: 'MU-VAG-2026',
    title: 'Varsity Athletics Grant',
    description: 'For rostered Meridian varsity athletes who represent the university in inter-collegiate competitions.',
    category: 'Athletic', grant_amount: 50000, min_grant_amount: 25000,
    grant_type: '₱50,000 tuition credit per semester + training meal allowance',
    min_gwa: 2.5, max_family_income: 0, deadline: '2026-10-09',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Medical clearance from the University Clinic'],
    eligible_programs: [], program_quotas: ALL_Q(3),
    is_renewable: true, renewal_deadline: '2027-01-08', created_at: '2026-07-28T09:00:00Z',
  }),
  mk({
    id: 'sch-006', code: 'MU-PEIS-2026',
    title: 'Power & Energy Engineering Industry Scholarship',
    description: 'Sponsored by Luzon Grid Energy Corp. for electrical, mechanical and chemical engineering students interested in the energy sector.',
    category: 'Industry', grant_amount: 55000, min_grant_amount: 30000,
    grant_type: '₱55,000 per semester + plant immersion program',
    min_gwa: 1.75, max_family_income: 800000, deadline: '2026-10-23',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Faculty Recommendation Letter'],
    eligible_programs: ['BS Electrical Engineering', 'BS Mechanical Engineering', 'BS Chemical Engineering'],
    program_quotas: quotas(['BS Electrical Engineering', 'BS Mechanical Engineering', 'BS Chemical Engineering'], [4, 3, 3]),
    eligible_year_levels: ['2nd Year', '3rd Year', '4th Year', '5th Year'],
    is_renewable: true, renewal_deadline: '2027-01-15', created_at: '2026-08-01T09:00:00Z',
  }),
  mk({
    id: 'sch-007', code: 'MU-BEIS-2026',
    title: 'Built Environment & Infrastructure Scholarship',
    description: 'Sponsored by the Meridian Builders Alliance for civil engineering and architecture students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 20000,
    grant_type: '₱45,000 per semester + site internship',
    min_gwa: 2.0, max_family_income: 700000, deadline: '2026-11-13',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Design portfolio or selected plates (PDF)'],
    eligible_programs: ['BS Civil Engineering', 'BS Architecture'],
    program_quotas: quotas(['BS Civil Engineering', 'BS Architecture'], [5, 4]),
    is_renewable: true, renewal_deadline: '2027-01-22', created_at: '2026-08-03T09:00:00Z',
  }),
  mk({
    id: 'sch-008', code: 'MU-BLTS-2026',
    title: 'Business Leaders of Tomorrow Scholarship',
    description: 'For Business Administration students with strong academics and a record of leadership or entrepreneurship.',
    category: 'Leadership', grant_amount: 40000, min_grant_amount: 20000,
    grant_type: '₱40,000 tuition credit per semester',
    min_gwa: 2.0, max_family_income: 650000, deadline: '2026-10-27',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Business case essay (max 2 pages)'],
    eligible_programs: ['BS Business Administration'], program_quotas: { 'BS Business Administration': 6 },
    is_renewable: true, renewal_deadline: '2027-01-15', created_at: '2026-08-05T09:00:00Z',
  }),
  mk({
    id: 'sch-009', code: 'MU-DHLG-2026',
    title: "Dean's Honors List Grant",
    description: "A one-semester tuition discount for students named to their college's Dean's List.",
    category: 'Academic', grant_amount: 25000, min_grant_amount: 10000,
    grant_type: '₱25,000 tuition discount for one semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-09-18',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', "Dean's List certification"],
    eligible_programs: [], program_quotas: ALL_Q(3),
    is_renewable: false, created_at: '2026-07-10T09:00:00Z',
  }),
  mk({
    id: 'sch-010', code: 'MU-WSEF-2026',
    title: 'Working Student Empowerment Fellowship',
    description: 'For students who support their own studies through part-time or full-time work.',
    category: 'Financial', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 450000, deadline: '2026-11-20',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Certificate of employment showing work schedule'],
    eligible_programs: [], program_quotas: ALL_Q(2),
    is_renewable: true, renewal_deadline: '2027-01-22', created_at: '2026-08-08T09:00:00Z',
  }),
  mk({
    id: 'sch-011', code: 'MU-URIG-2026',
    title: 'Undergraduate Research & Innovation Grant',
    description: 'Funds thesis and capstone research for upper-year students in research-track programs.',
    category: 'Research', grant_amount: 50000, min_grant_amount: 25000,
    grant_type: '₱50,000 per semester (tuition credit + research materials)',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-11-27',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'Approved research proposal'],
    eligible_programs: ['BS Computer Science', 'BS Data Science & Analytics', 'BS Chemical Engineering', 'BS Civil Engineering', 'BS Electrical Engineering'],
    program_quotas: quotas(['BS Computer Science', 'BS Data Science & Analytics', 'BS Chemical Engineering', 'BS Civil Engineering', 'BS Electrical Engineering'], 2),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-08-10T09:00:00Z',
  }),
  mk({
    id: 'sch-012', code: 'MU-ALES-2026',
    title: 'Alumni Legacy Endowment Scholarship',
    description: 'Funded by the Meridian Alumni Association for children of Meridian graduates.',
    category: 'Alumni', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 900000, deadline: '2026-10-02',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)', 'PSA birth certificate showing relationship to the alumnus'],
    eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: true, renewal_deadline: '2027-01-08', created_at: '2026-08-12T09:00:00Z',
  }),
  mk({
    id: 'sch-013', code: 'MU-CSIS-2026',
    title: 'Community & Social Impact Scholarship',
    description: 'For students with sustained volunteer work in community development, disaster response or environmental programs.',
    category: 'Community', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-11-10',
    requirements: ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)'],
    eligible_programs: [], program_quotas: ALL_Q(2),
    is_renewable: false, created_at: '2026-08-14T09:00:00Z',
  }),
];

// ---------------------------------------------------------------------------
// Applications — each applicant exists in the Registrar records
// ---------------------------------------------------------------------------

const docFile = (sn: string, last: string, code: string, label: string, i: number, date: string, ext = 'pdf'): ApplicationDocument => ({
  id: `doc-${sn}-${i}`,
  type: code === 'COE' ? 'com' : code.startsWith('ITR') ? 'itr' : 'other',
  label,
  requirement_code: code,
  name: `${sn}_${last.toUpperCase().replace(/[^A-Z]/g, '')}_${code}.${ext}`,
  original_name: `${label.split(' ').slice(0, 3).join('_')}.${ext}`,
  url: '#',
  size: `${(0.4 + ((i * 37) % 20) / 10).toFixed(1)} MB`,
  uploaded_at: date,
  file_type: ext === 'pdf' ? 'application/pdf' : 'image/jpeg',
});

interface SeedApp {
  id: string; ref: string; sn: string; sch: string; status: Application['status'];
  created: string; updated: string; household: Application['household_members'];
  answers: Record<string, string>; remarks: string; staff_notes?: string;
  awarded?: number; approved_at?: string; expires_at?: string; grant_term?: string;
  approved_by?: string; endorsed_by?: string; endorsed_at?: string;
  working?: number; extraDocs?: [string, string][];
}

const buildApp = (a: SeedApp): Application => {
  const st = findRegistrarStudent(a.sn)!;
  const sch = INITIAL_SCHOLARSHIPS.find((s) => s.id === a.sch)!;
  const date = a.created.split('T')[0];
  const docs: ApplicationDocument[] = [];
  let i = 0;
  sch.requirements.forEach((r) => {
    const code = r.includes('Enrollment') ? 'COE' : r.includes('Grades') ? 'GRADES' : r.includes('ITR') ? 'ITR' : r.includes('Recommendation') ? 'RECOMMENDATION' : r.includes('portfolio') || r.includes('Portfolio') ? 'PORTFOLIO' : r.includes('Good Moral') ? 'GOODMORAL' : r.includes('utility') ? 'UTILITY' : r.includes('statement') ? 'ESSAY' : 'DOC' + (i + 1);
    docs.push(docFile(st.student_number, st.last_name, code, r, i++, date));
  });
  a.household.forEach((m) => {
    const rel = m.relation.toUpperCase();
    if (m.employment_status && m.employment_status !== 'Unemployed') {
      docs.push(docFile(st.student_number, st.last_name, `ITR-${rel}`, `Proof of income — ${m.name} (${m.relation})`, i++, date));
    } else if (m.relation !== 'Sibling') {
      docs.push(docFile(st.student_number, st.last_name, `NOINCOME-${rel}`, `Certificate of no income — ${m.name} (${m.relation})`, i++, date));
    }
  });
  (a.extraDocs || []).forEach(([code, label]) => docs.push(docFile(st.student_number, st.last_name, code, label, i++, date)));

  const annual = a.household.reduce((acc, m) => acc + (m.annual_income || 0), 0) + (a.working || 0);
  return {
    id: a.id,
    reference_code: a.ref,
    scholarship_id: sch.id,
    scholarship_title: sch.title,
    student_number: st.student_number,
    first_name: st.first_name,
    middle_name: st.middle_name,
    last_name: st.last_name,
    gender: st.sex,
    birthdate: st.birthdate,
    email: st.email,
    phone: st.mobile,
    program: st.program,
    year_level: st.year_level,
    gwa: st.gwa,
    monthly_family_income: Math.round(annual / 12),
    annual_family_income: annual,
    is_working_student: Boolean(a.working),
    student_annual_income: a.working || 0,
    household_members: a.household,
    documents: docs,
    screening_answers: a.answers,
    status: a.status,
    awarded_amount: a.awarded || 0,
    remarks: a.remarks,
    staff_notes: a.staff_notes || '',
    approved_at: a.approved_at,
    approved_by: a.approved_by,
    expires_at: a.expires_at,
    grant_term: a.grant_term,
    endorsed_by: a.endorsed_by,
    endorsed_at: a.endorsed_at,
    created_at: a.created,
    updated_at: a.updated,
  } as Application;
};

const hm = (id: string, name: string, relation: string, occupation: string, status: NonNullable<Application['household_members'][number]['employment_status']>, annual: number) => {
  const [first, ...rest] = name.split(' ');
  return { id, name, first_name: first, last_name: rest[rest.length - 1], relation, occupation, employment_status: status, annual_income: annual, monthly_income: Math.round(annual / 12) };
};

const ADMIN_NAME = 'Prof. Benedict A. Luna (Scholarship Coordinator)';
const HEAD_NAME = 'Prof. Corazon V. Santos';

// Fresh start: no applications. Students create them by applying.
export const INITIAL_APPLICATIONS: Application[] = [];

export const INITIAL_FREEZE_PERIODS: FreezePeriod[] = [];

export const INITIAL_INTERVIEWS: InterviewSchedule[] = [];

// ---------------------------------------------------------------------------
// Staff access requests (staff register with their Staff ID only)
// ---------------------------------------------------------------------------

const staffRequest = (id: string, staffId: string, status: StaffApplication['status'], created: string, extra: Partial<StaffApplication> = {}): StaffApplication => {
  const hr = HR_STAFF_DIRECTORY.find((h) => h.staff_id === staffId)!;
  return {
    id,
    first_name: hr.first_name,
    middle_name: hr.middle_name,
    last_name: hr.last_name,
    full_name: staffFullName(hr),
    email: hr.email,
    institutional_email: hr.email,
    phone: hr.mobile,
    phone_number: hr.mobile,
    birthdate: '',
    staff_id: hr.staff_id,
    staff_id_number: hr.staff_id,
    department: hr.department,
    position: hr.position,
    status,
    created_at: created,
    ...extra,
  };
};

// ---------------------------------------------------------------------------
// Staff access requests — starts empty. Staff apply with the "Request staff access" form on the sign-in page
// (three HR-listed employees without accounts are available for this: see HR_STAFF_DIRECTORY).
// ---------------------------------------------------------------------------
export const INITIAL_STAFF_APPLICATIONS: StaffApplication[] = [];
