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
const BASE_REQ = ['Certificate of Enrollment (current semester)', 'Certified True Copy of Grades (previous semester)'];
const ENG = ['BS Civil Engineering', 'BS Electrical Engineering', 'BS Mechanical Engineering', 'BS Chemical Engineering'];
const only = (programs: string[], n = 2) => ({ eligible_programs: programs, program_quotas: quotas(programs, n) });

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
  // ---------------- INDUSTRY (program-specific) ----------------
  mk({
    id: 'sch-014', code: 'MU-CCII-2026', title: 'Cybersecurity & Cloud Industry Scholarship',
    description: 'Sponsored by a cloud and security firm for computing students.',
    category: 'Industry', grant_amount: 50000, min_grant_amount: 25000,
    grant_type: '₱50,000 per semester + certification voucher',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-12',
    requirements: BASE_REQ, ...only(COMPUTING),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-015', code: 'MU-FSVI-2026', title: 'Financial Services Industry Scholarship',
    description: 'Sponsored by a banking and fintech group for computing and business students.',
    category: 'Industry', grant_amount: 46000, min_grant_amount: 23000,
    grant_type: '₱46,000 per semester + internship slot',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-13',
    requirements: BASE_REQ, ...only([...COMPUTING, 'BS Business Administration']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-016', code: 'MU-RECI-2026', title: 'Retail & E-commerce Industry Scholarship',
    description: 'Sponsored by an online marketplace partner for computing and business students.',
    category: 'Industry', grant_amount: 42000, min_grant_amount: 21000,
    grant_type: '₱42,000 per semester + store immersion program',
    min_gwa: 2.25, max_family_income: 750000, deadline: '2026-12-14',
    requirements: BASE_REQ, ...only([...COMPUTING, 'BS Business Administration']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-017', code: 'MU-CMII-2026', title: 'Creative & Media Industry Scholarship',
    description: 'Sponsored by a media and design studio for students in digital, design and business programs.',
    category: 'Industry', grant_amount: 40000, min_grant_amount: 20000,
    grant_type: '₱40,000 per semester + studio internship',
    min_gwa: 2.25, max_family_income: 750000, deadline: '2026-12-15',
    requirements: BASE_REQ, ...only([...COMPUTING, 'BS Architecture', 'BS Business Administration']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-018', code: 'MU-DCII-2026', title: 'Data Center & Digital Infrastructure Scholarship',
    description: 'Sponsored by a data center operator for computing and electrical engineering students.',
    category: 'Industry', grant_amount: 52000, min_grant_amount: 26000,
    grant_type: '₱52,000 per semester + facility internship',
    min_gwa: 1.75, max_family_income: 800000, deadline: '2026-12-16',
    requirements: BASE_REQ, ...only([...COMPUTING, 'BS Electrical Engineering']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-019', code: 'MU-SMIS-2026', title: 'Smart Manufacturing Industry Scholarship',
    description: 'Sponsored by a regional factory group for engineering students.',
    category: 'Industry', grant_amount: 48000, min_grant_amount: 24000,
    grant_type: '₱48,000 per semester + plant immersion',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-12',
    requirements: BASE_REQ, ...only(ENG),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-020', code: 'MU-IAIS-2026', title: 'Industrial Automation Scholarship',
    description: 'Sponsored by an automation and robotics company for electrical, mechanical and chemical engineering students.',
    category: 'Industry', grant_amount: 50000, min_grant_amount: 25000,
    grant_type: '₱50,000 per semester + training program',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-13',
    requirements: BASE_REQ, ...only(['BS Electrical Engineering', 'BS Mechanical Engineering', 'BS Chemical Engineering']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-021', code: 'MU-IUIG-2026', title: 'Infrastructure & Utilities Industry Grant',
    description: 'Sponsored by utility and public works partners for engineering and architecture students.',
    category: 'Industry', grant_amount: 46000, min_grant_amount: 23000,
    grant_type: '₱46,000 per semester + field internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-14',
    requirements: BASE_REQ, ...only([...ENG, 'BS Architecture']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-022', code: 'MU-CREI-2026', title: 'Construction & Real Estate Industry Scholarship',
    description: 'Sponsored by a property developer for civil engineering, architecture and business students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + site internship',
    min_gwa: 2.0, max_family_income: 750000, deadline: '2026-12-15',
    requirements: BASE_REQ, ...only(['BS Civil Engineering', 'BS Architecture', 'BS Business Administration']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-023', code: 'MU-UDDS-2026', title: 'Urban Design & Development Scholarship',
    description: 'Sponsored by a city planning partner for students shaping the built environment.',
    category: 'Industry', grant_amount: 42000, min_grant_amount: 21000,
    grant_type: '₱42,000 per semester + planning office internship',
    min_gwa: 2.0, max_family_income: 750000, deadline: '2026-12-16',
    requirements: BASE_REQ, ...only(['BS Architecture', 'BS Civil Engineering', 'BS Business Administration']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-024', code: 'MU-PMIS-2026', title: 'Process & Materials Industry Scholarship',
    description: 'Sponsored by a chemicals and materials company for process-oriented engineering students.',
    category: 'Industry', grant_amount: 48000, min_grant_amount: 24000,
    grant_type: '₱48,000 per semester + lab internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-17',
    requirements: BASE_REQ, ...only(['BS Mechanical Engineering', 'BS Chemical Engineering', 'BS Electrical Engineering']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),

  // ---------------- RESEARCH (program-specific) ----------------
  mk({
    id: 'sch-025', code: 'MU-EDRG-2026', title: 'Engineering Design Research Grant',
    description: 'Funds design and testing research for engineering and architecture students.',
    category: 'Research', grant_amount: 42000, min_grant_amount: 21000,
    grant_type: '₱42,000 per semester + lab access',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-12',
    requirements: BASE_REQ, ...only([...ENG, 'BS Architecture']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-026', code: 'MU-EMRG-2026', title: 'Entrepreneurship & Market Research Grant',
    description: 'Funds market studies and venture research for business students.',
    category: 'Research', grant_amount: 36000, min_grant_amount: 18000,
    grant_type: '₱36,000 per semester + research materials',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-13',
    requirements: BASE_REQ, ...only(['BS Business Administration']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-027', code: 'MU-BARG-2026', title: 'Business Analytics Research Grant',
    description: 'Funds research on consumer behavior, operations and business data.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + analytics tools',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-14',
    requirements: BASE_REQ, ...only(['BS Business Administration']),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),

  // ---------------- ACADEMIC (open to all) ----------------
  mk({
    id: 'sch-028', code: 'MU-APAS-2026', title: 'Academic Progress Award',
    description: 'For students who improved their GWA over the previous semester.',
    category: 'Academic', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition credit for one semester',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-12',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-029', code: 'MU-DSAS-2026', title: "Deans' Scholars Academic Scholarship",
    description: 'For students recommended by their college dean for academic distinction.',
    category: 'Academic', grant_amount: 33000, min_grant_amount: 16000,
    grant_type: '₱33,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-13',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
     is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
    // ---------------- RESEARCH (open to all programs) ----------------
  mk({
    id: 'sch-030', code: 'MU-TCRA-2026', title: 'Thesis & Capstone Research Grant',
    description: 'Funds thesis and capstone projects for graduating students in any program.',
    category: 'Research', grant_amount: 40000, min_grant_amount: 20000,
    grant_type: '₱40,000 research fund (tuition credit + materials)',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-12',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    eligible_year_levels: ['4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-031', code: 'MU-ARMA-2026', title: 'Applied Research Mentorship Grant',
    description: 'Pairs students with faculty mentors for applied research projects.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + faculty mentorship',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-13',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-032', code: 'MU-RCPA-2026', title: 'Research Conference & Publication Grant',
    description: 'Covers fees for presenting or publishing student research at conferences and journals.',
    category: 'Research', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 conference and publication fund',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-14',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-033', code: 'MU-SRGA-2026', title: 'Sustainability Research Grant',
    description: 'For research on environment, energy and sustainable development.',
    category: 'Research', grant_amount: 40000, min_grant_amount: 20000,
    grant_type: '₱40,000 per semester + field work allowance',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-15',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-034', code: 'MU-URSG-2026', title: 'Undergraduate Research Starter Grant',
    description: 'Seed funding for students starting their first research project.',
    category: 'Research', grant_amount: 25000, min_grant_amount: 12000,
    grant_type: '₱25,000 research starter fund',
    min_gwa: 2.25, max_family_income: 0, deadline: '2026-12-16',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-035', code: 'MU-IPIA-2026', title: 'Innovation Prototype Incubation Grant',
    description: 'Funds students building working prototypes and inventions.',
    category: 'Research', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 prototype fund + lab access',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-17',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),

  // ---------------- PERFORMING ARTS (open to all programs) ----------------
  mk({
    id: 'sch-036', code: 'MU-DTPA-2026', title: 'Dance Troupe Performers Grant',
    description: 'For members of the university dance troupe.',
    category: 'Performing Arts', grant_amount: 35000, min_grant_amount: 17000,
    grant_type: '₱35,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 0, deadline: '2026-12-12',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-037', code: 'MU-CHPA-2026', title: 'University Choir Scholarship',
    description: 'For members of the university choir and vocal ensembles.',
    category: 'Performing Arts', grant_amount: 35000, min_grant_amount: 17000,
    grant_type: '₱35,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 0, deadline: '2026-12-13',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-038', code: 'MU-MIPA-2026', title: 'Instrumental Music Grant',
    description: 'For students in the university band, orchestra or rondalla.',
    category: 'Performing Arts', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 0, deadline: '2026-12-14',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-039', code: 'MU-THPA-2026', title: 'Theater Guild Scholarship',
    description: 'For actors and production crew of the university theater guild.',
    category: 'Performing Arts', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 0, deadline: '2026-12-15',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-040', code: 'MU-VAPA-2026', title: 'Visual Arts & Design Talent Grant',
    description: 'For students with outstanding work in painting, illustration, photography or digital art.',
    category: 'Performing Arts', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition credit per semester',
    min_gwa: 2.75, max_family_income: 0, deadline: '2026-12-16',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
  mk({
    id: 'sch-041', code: 'MU-FMPA-2026', title: 'Film & Media Arts Grant',
    description: 'For student filmmakers and performers in campus film and media productions.',
    category: 'Performing Arts', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 2.75, max_family_income: 0, deadline: '2026-12-17',
    requirements: BASE_REQ, eligible_programs: [], program_quotas: ALL_Q(1),
    is_renewable: false, created_at: '2026-10-06T09:00:00Z',
  }),
    // ---------------- BS COMPUTER SCIENCE ----------------
  mk({
    id: 'sch-042', code: 'MU-CS1-2026', title: 'Computer Science Academic Excellence Award',
    description: 'For Computer Science students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-18',
    requirements: BASE_REQ, ...only(['BS Computer Science']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-043', code: 'MU-CS2-2026', title: 'Computer Science Industry Partner Scholarship',
    description: 'Sponsored by a software company for Computer Science students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + internship slot',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-18',
    requirements: BASE_REQ, ...only(['BS Computer Science']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-044', code: 'MU-CS3-2026', title: 'Computer Science Research Grant',
    description: 'Funds algorithms, AI and systems research for upper-year Computer Science students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + research materials',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-18',
    requirements: BASE_REQ, ...only(['BS Computer Science']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-045', code: 'MU-CS4-2026', title: 'Computer Science Leaders Fellowship',
    description: 'For Computer Science students who lead tech organizations or hackathon teams.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-18',
    requirements: BASE_REQ, ...only(['BS Computer Science']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-046', code: 'MU-CS5-2026', title: 'Computer Science Access Grant',
    description: 'Financial aid for Computer Science students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-18',
    requirements: BASE_REQ, ...only(['BS Computer Science']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-047', code: 'MU-CS6-2026', title: 'Computer Science Community Impact Scholarship',
    description: 'For Computer Science students who build software for community projects.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-18',
    requirements: BASE_REQ, ...only(['BS Computer Science']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS INFORMATION TECHNOLOGY ----------------
  mk({
    id: 'sch-048', code: 'MU-IT1-2026', title: 'Information Technology Academic Excellence Award',
    description: 'For Information Technology students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-19',
    requirements: BASE_REQ, ...only(['BS Information Technology']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-049', code: 'MU-IT2-2026', title: 'Information Technology Industry Partner Scholarship',
    description: 'Sponsored by a managed services provider for Information Technology students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + helpdesk internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-19',
    requirements: BASE_REQ, ...only(['BS Information Technology']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-050', code: 'MU-IT3-2026', title: 'Information Technology Research Grant',
    description: 'Funds networking, security and cloud research for upper-year Information Technology students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + lab access',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-19',
    requirements: BASE_REQ, ...only(['BS Information Technology']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-051', code: 'MU-IT4-2026', title: 'Information Technology Leaders Fellowship',
    description: 'For Information Technology students who lead campus tech support or student organizations.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-19',
    requirements: BASE_REQ, ...only(['BS Information Technology']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-052', code: 'MU-IT5-2026', title: 'Information Technology Access Grant',
    description: 'Financial aid for Information Technology students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-19',
    requirements: BASE_REQ, ...only(['BS Information Technology']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-053', code: 'MU-IT6-2026', title: 'Information Technology Community Impact Scholarship',
    description: 'For Information Technology students who set up and support tech for community programs.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-19',
    requirements: BASE_REQ, ...only(['BS Information Technology']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS SOFTWARE ENGINEERING ----------------
  mk({
    id: 'sch-054', code: 'MU-SE1-2026', title: 'Software Engineering Academic Excellence Award',
    description: 'For Software Engineering students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-20',
    requirements: BASE_REQ, ...only(['BS Software Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-055', code: 'MU-SE2-2026', title: 'Software Engineering Industry Partner Scholarship',
    description: 'Sponsored by a product development firm for Software Engineering students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + engineering internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-20',
    requirements: BASE_REQ, ...only(['BS Software Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-056', code: 'MU-SE3-2026', title: 'Software Engineering Research Grant',
    description: 'Funds software architecture, testing and DevOps research for upper-year Software Engineering students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + research materials',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-20',
    requirements: BASE_REQ, ...only(['BS Software Engineering']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-057', code: 'MU-SE4-2026', title: 'Software Engineering Leaders Fellowship',
    description: 'For Software Engineering students who lead project teams or developer communities.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-20',
    requirements: BASE_REQ, ...only(['BS Software Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-058', code: 'MU-SE5-2026', title: 'Software Engineering Access Grant',
    description: 'Financial aid for Software Engineering students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-20',
    requirements: BASE_REQ, ...only(['BS Software Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-059', code: 'MU-SE6-2026', title: 'Software Engineering Community Impact Scholarship',
    description: 'For Software Engineering students who contribute to open-source and community software projects.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-20',
    requirements: BASE_REQ, ...only(['BS Software Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS DATA SCIENCE & ANALYTICS ----------------
  mk({
    id: 'sch-060', code: 'MU-DS1-2026', title: 'Data Science Academic Excellence Award',
    description: 'For Data Science & Analytics students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-21',
    requirements: BASE_REQ, ...only(['BS Data Science & Analytics']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-061', code: 'MU-DS2-2026', title: 'Data Science Industry Partner Scholarship',
    description: 'Sponsored by an analytics company for Data Science & Analytics students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + analytics internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-21',
    requirements: BASE_REQ, ...only(['BS Data Science & Analytics']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-062', code: 'MU-DS3-2026', title: 'Data Science Research Grant',
    description: 'Funds machine learning and statistical research for upper-year Data Science & Analytics students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + computing resources',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-21',
    requirements: BASE_REQ, ...only(['BS Data Science & Analytics']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-063', code: 'MU-DS4-2026', title: 'Data Science Leaders Fellowship',
    description: 'For Data Science & Analytics students who lead data clubs or competition teams.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-21',
    requirements: BASE_REQ, ...only(['BS Data Science & Analytics']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-064', code: 'MU-DS5-2026', title: 'Data Science Access Grant',
    description: 'Financial aid for Data Science & Analytics students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-21',
    requirements: BASE_REQ, ...only(['BS Data Science & Analytics']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-065', code: 'MU-DS6-2026', title: 'Data Science Community Impact Scholarship',
    description: 'For Data Science & Analytics students who use data to support community and public-interest projects.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-21',
    requirements: BASE_REQ, ...only(['BS Data Science & Analytics']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS CIVIL ENGINEERING ----------------
  mk({
    id: 'sch-066', code: 'MU-CE1-2026', title: 'Civil Engineering Academic Excellence Award',
    description: 'For Civil Engineering students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-22',
    requirements: BASE_REQ, ...only(['BS Civil Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-067', code: 'MU-CE2-2026', title: 'Civil Engineering Industry Partner Scholarship',
    description: 'Sponsored by a construction firm for Civil Engineering students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + site internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-22',
    requirements: BASE_REQ, ...only(['BS Civil Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-068', code: 'MU-CE3-2026', title: 'Civil Engineering Research Grant',
    description: 'Funds structural, materials and transportation research for upper-year Civil Engineering students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + testing lab access',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-22',
    requirements: BASE_REQ, ...only(['BS Civil Engineering']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-069', code: 'MU-CE4-2026', title: 'Civil Engineering Leaders Fellowship',
    description: 'For Civil Engineering students who lead engineering societies or build projects for the campus.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-22',
    requirements: BASE_REQ, ...only(['BS Civil Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-070', code: 'MU-CE5-2026', title: 'Civil Engineering Access Grant',
    description: 'Financial aid for Civil Engineering students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-22',
    requirements: BASE_REQ, ...only(['BS Civil Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-071', code: 'MU-CE6-2026', title: 'Civil Engineering Community Impact Scholarship',
    description: 'For Civil Engineering students who join community infrastructure and disaster-recovery projects.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-22',
    requirements: BASE_REQ, ...only(['BS Civil Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS ELECTRICAL ENGINEERING ----------------
  mk({
    id: 'sch-072', code: 'MU-EE1-2026', title: 'Electrical Engineering Academic Excellence Award',
    description: 'For Electrical Engineering students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-23',
    requirements: BASE_REQ, ...only(['BS Electrical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-073', code: 'MU-EE2-2026', title: 'Electrical Engineering Industry Partner Scholarship',
    description: 'Sponsored by an electrical and power company for Electrical Engineering students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + plant internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-23',
    requirements: BASE_REQ, ...only(['BS Electrical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-074', code: 'MU-EE3-2026', title: 'Electrical Engineering Research Grant',
    description: 'Funds power systems, electronics and controls research for upper-year Electrical Engineering students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + lab access',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-23',
    requirements: BASE_REQ, ...only(['BS Electrical Engineering']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-075', code: 'MU-EE4-2026', title: 'Electrical Engineering Leaders Fellowship',
    description: 'For Electrical Engineering students who lead engineering societies or build projects for the campus.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-23',
    requirements: BASE_REQ, ...only(['BS Electrical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-076', code: 'MU-EE5-2026', title: 'Electrical Engineering Access Grant',
    description: 'Financial aid for Electrical Engineering students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-23',
    requirements: BASE_REQ, ...only(['BS Electrical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-077', code: 'MU-EE6-2026', title: 'Electrical Engineering Community Impact Scholarship',
    description: 'For Electrical Engineering students who help bring power and electrical safety to communities.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-23',
    requirements: BASE_REQ, ...only(['BS Electrical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS MECHANICAL ENGINEERING ----------------
  mk({
    id: 'sch-078', code: 'MU-ME1-2026', title: 'Mechanical Engineering Academic Excellence Award',
    description: 'For Mechanical Engineering students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-24',
    requirements: BASE_REQ, ...only(['BS Mechanical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-079', code: 'MU-ME2-2026', title: 'Mechanical Engineering Industry Partner Scholarship',
    description: 'Sponsored by a manufacturing company for Mechanical Engineering students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + plant internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-24',
    requirements: BASE_REQ, ...only(['BS Mechanical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-080', code: 'MU-ME3-2026', title: 'Mechanical Engineering Research Grant',
    description: 'Funds thermal systems, machine design and materials research for upper-year Mechanical Engineering students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + workshop access',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-24',
    requirements: BASE_REQ, ...only(['BS Mechanical Engineering']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-081', code: 'MU-ME4-2026', title: 'Mechanical Engineering Leaders Fellowship',
    description: 'For Mechanical Engineering students who lead engineering societies or build projects for the campus.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-24',
    requirements: BASE_REQ, ...only(['BS Mechanical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-082', code: 'MU-ME5-2026', title: 'Mechanical Engineering Access Grant',
    description: 'Financial aid for Mechanical Engineering students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-24',
    requirements: BASE_REQ, ...only(['BS Mechanical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-083', code: 'MU-ME6-2026', title: 'Mechanical Engineering Community Impact Scholarship',
    description: 'For Mechanical Engineering students who build or repair equipment for community programs.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-24',
    requirements: BASE_REQ, ...only(['BS Mechanical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS CHEMICAL ENGINEERING ----------------
  mk({
    id: 'sch-084', code: 'MU-CHE1-2026', title: 'Chemical Engineering Academic Excellence Award',
    description: 'For Chemical Engineering students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-25',
    requirements: BASE_REQ, ...only(['BS Chemical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-085', code: 'MU-CHE2-2026', title: 'Chemical Engineering Industry Partner Scholarship',
    description: 'Sponsored by a chemicals and processing company for Chemical Engineering students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + lab internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-25',
    requirements: BASE_REQ, ...only(['BS Chemical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-086', code: 'MU-CHE3-2026', title: 'Chemical Engineering Research Grant',
    description: 'Funds process, materials and environmental research for upper-year Chemical Engineering students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + lab supplies',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-25',
    requirements: BASE_REQ, ...only(['BS Chemical Engineering']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-087', code: 'MU-CHE4-2026', title: 'Chemical Engineering Leaders Fellowship',
    description: 'For Chemical Engineering students who lead engineering societies or build projects for the campus.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-25',
    requirements: BASE_REQ, ...only(['BS Chemical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-088', code: 'MU-CHE5-2026', title: 'Chemical Engineering Access Grant',
    description: 'Financial aid for Chemical Engineering students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-25',
    requirements: BASE_REQ, ...only(['BS Chemical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-089', code: 'MU-CHE6-2026', title: 'Chemical Engineering Community Impact Scholarship',
    description: 'For Chemical Engineering students who work on clean water and environmental community programs.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-25',
    requirements: BASE_REQ, ...only(['BS Chemical Engineering']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS ARCHITECTURE ----------------
  mk({
    id: 'sch-090', code: 'MU-AR1-2026', title: 'Architecture Academic Excellence Award',
    description: 'For Architecture students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-26',
    requirements: BASE_REQ, ...only(['BS Architecture']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-091', code: 'MU-AR2-2026', title: 'Architecture Industry Partner Scholarship',
    description: 'Sponsored by an architecture and design firm for Architecture students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + studio internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-26',
    requirements: BASE_REQ, ...only(['BS Architecture']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-092', code: 'MU-AR3-2026', title: 'Architecture Research Grant',
    description: 'Funds sustainable design, urban planning and heritage research for upper-year Architecture students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + model-making materials',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-26',
    requirements: BASE_REQ, ...only(['BS Architecture']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-093', code: 'MU-AR4-2026', title: 'Architecture Leaders Fellowship',
    description: 'For Architecture students who lead design organizations or campus design projects.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-26',
    requirements: BASE_REQ, ...only(['BS Architecture']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-094', code: 'MU-AR5-2026', title: 'Architecture Access Grant',
    description: 'Financial aid for Architecture students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-26',
    requirements: BASE_REQ, ...only(['BS Architecture']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-095', code: 'MU-AR6-2026', title: 'Architecture Community Impact Scholarship',
    description: 'For Architecture students who design for community spaces and low-cost housing projects.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-26',
    requirements: BASE_REQ, ...only(['BS Architecture']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),

  // ---------------- BS BUSINESS ADMINISTRATION ----------------
  mk({
    id: 'sch-096', code: 'MU-BA1-2026', title: 'Business Administration Academic Excellence Award',
    description: 'For Business Administration students with an outstanding GWA.',
    category: 'Academic', grant_amount: 30000, min_grant_amount: 15000,
    grant_type: '₱30,000 tuition credit per semester',
    min_gwa: 1.75, max_family_income: 0, deadline: '2026-12-27',
    requirements: BASE_REQ, ...only(['BS Business Administration']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-097', code: 'MU-BA2-2026', title: 'Business Administration Industry Partner Scholarship',
    description: 'Sponsored by a corporate partner for Business Administration students.',
    category: 'Industry', grant_amount: 45000, min_grant_amount: 22000,
    grant_type: '₱45,000 per semester + corporate internship',
    min_gwa: 2.0, max_family_income: 800000, deadline: '2026-12-27',
    requirements: BASE_REQ, ...only(['BS Business Administration']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-098', code: 'MU-BA3-2026', title: 'Business Administration Research Grant',
    description: 'Funds marketing, finance and management research for upper-year Business Administration students.',
    category: 'Research', grant_amount: 38000, min_grant_amount: 19000,
    grant_type: '₱38,000 per semester + research materials',
    min_gwa: 2.0, max_family_income: 0, deadline: '2026-12-27',
    requirements: BASE_REQ, ...only(['BS Business Administration']),
    eligible_year_levels: ['3rd Year', '4th Year', '5th Year'],
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-099', code: 'MU-BA4-2026', title: 'Business Administration Leaders Fellowship',
    description: 'For Business Administration students who lead business organizations or run student ventures.',
    category: 'Leadership', grant_amount: 32000, min_grant_amount: 16000,
    grant_type: '₱32,000 tuition credit per semester',
    min_gwa: 2.25, max_family_income: 650000, deadline: '2026-12-27',
    requirements: BASE_REQ, ...only(['BS Business Administration']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-100', code: 'MU-BA5-2026', title: 'Business Administration Access Grant',
    description: 'Financial aid for Business Administration students from low-income households.',
    category: 'Financial', grant_amount: 28000, min_grant_amount: 14000,
    grant_type: '₱28,000 tuition assistance per semester',
    min_gwa: 2.75, max_family_income: 400000, deadline: '2026-12-27',
    requirements: BASE_REQ, ...only(['BS Business Administration']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
  }),
  mk({
    id: 'sch-101', code: 'MU-BA6-2026', title: 'Business Administration Community Impact Scholarship',
    description: 'For Business Administration students who run livelihood and small-business programs for communities.',
    category: 'Community', grant_amount: 26000, min_grant_amount: 13000,
    grant_type: '₱26,000 tuition credit per semester',
    min_gwa: 2.5, max_family_income: 500000, deadline: '2026-12-27',
    requirements: BASE_REQ, ...only(['BS Business Administration']),
    is_renewable: false, created_at: '2026-10-07T09:00:00Z',
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
