/**
 * Meridian University — master records that ScholarFlow READS but does not own.
 *
 * In production these come from the Registrar's Student Information System (students)
 * and the Human Resources Information System (staff). ScholarFlow only looks records up
 * by ID to pre-fill forms and to confirm that a person really belongs to the university.
 * They are kept as a read-only module here so the portal works without a live SIS/HRIS link.
 */

// ---------------------------------------------------------------------------
// Degree programs offered (the only programs ScholarFlow scholarships can target)
// ---------------------------------------------------------------------------

export const COLLEGES: { name: string; programs: string[] }[] = [
  {
    name: 'College of Computing & Information Sciences',
    programs: [
      'BS Computer Science',
      'BS Information Technology',
      'BS Software Engineering',
      'BS Data Science & Analytics',
    ],
  },
  {
    name: 'College of Engineering & Architecture',
    programs: [
      'BS Civil Engineering',
      'BS Electrical Engineering',
      'BS Mechanical Engineering',
      'BS Chemical Engineering',
      'BS Architecture',
    ],
  },
  {
    name: 'College of Business & Management',
    programs: ['BS Business Administration'],
  },
];

export const ACADEMIC_PROGRAMS: string[] = COLLEGES.flatMap((c) => c.programs);

export const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

export function collegeOf(program: string): string {
  return COLLEGES.find((c) => c.programs.includes(program))?.name || '—';
}

// ---------------------------------------------------------------------------
// GWA scale (Philippine 1.00–5.00 scale)
// ---------------------------------------------------------------------------

export const GWA_SCALE_NOTE =
  'Meridian uses the 1.00–5.00 scale: 1.00 is the highest grade, 3.00 is the lowest passing grade, 5.00 is failing. A lower number means a better GWA.';

// ---------------------------------------------------------------------------
// Registrar — enrolled students
// ---------------------------------------------------------------------------

export type EnrollmentStatus = 'Enrolled' | 'On Leave' | 'Graduated';

export interface RegistrarStudent {
  student_number: string; // 10 digits, first 4 = year admitted
  first_name: string;
  middle_name?: string;
  last_name: string;
  sex: 'Male' | 'Female';
  birthdate: string; // YYYY-MM-DD
  email: string; // institutional email
  mobile: string; // mobile on file (used for account recovery)
  program: string;
  year_level: string;
  gwa: number; // cumulative GWA as certified by the Registrar
  enrollment_status: EnrollmentStatus;
}

export const STUDENT_EMAIL_DOMAIN = 'student.meridian.edu';
export const STAFF_EMAIL_DOMAIN = 'meridian.edu';

export const REGISTRAR_STUDENTS: RegistrarStudent[] = [
  // Five students ready to activate (Student Sign Up) for testing the full application flow.
  { student_number: '2023109345', first_name: 'Gabriel Andre', middle_name: 'L.', last_name: 'Salazar', sex: 'Male', birthdate: '2004-08-12', email: 'gabriel.salazar@student.meridian.edu', mobile: '09175550456', program: 'BS Computer Science', year_level: '3rd Year', gwa: 1.5, enrollment_status: 'Enrolled' },
  { student_number: '2023108817', first_name: 'Isabella Grace', middle_name: 'T.', last_name: 'Mercado', sex: 'Female', birthdate: '2005-03-21', email: 'isabella.mercado@student.meridian.edu', mobile: '09175550123', program: 'BS Information Technology', year_level: '3rd Year', gwa: 1.45, enrollment_status: 'Enrolled' },
  { student_number: '2024110562', first_name: 'Miguel Antonio', middle_name: 'R.', last_name: 'Dela Cruz', sex: 'Male', birthdate: '2005-06-30', email: 'miguel.delacruz@student.meridian.edu', mobile: '09175550789', program: 'BS Civil Engineering', year_level: '2nd Year', gwa: 2.0, enrollment_status: 'Enrolled' },
  { student_number: '2022109078', first_name: 'Katrina Joy', middle_name: 'M.', last_name: 'Ocampo', sex: 'Female', birthdate: '2003-11-09', email: 'katrina.ocampo@student.meridian.edu', mobile: '09175550321', program: 'BS Business Administration', year_level: '4th Year', gwa: 1.65, enrollment_status: 'Enrolled' },
  { student_number: '2024104430', first_name: 'Joaquin Rafael', middle_name: 'B.', last_name: 'Pineda', sex: 'Male', birthdate: '2005-01-17', email: 'joaquin.pineda@student.meridian.edu', mobile: '09175550654', program: 'BS Electrical Engineering', year_level: '2nd Year', gwa: 1.75, enrollment_status: 'Enrolled' },
];

export function findRegistrarStudent(studentNumber: string): RegistrarStudent | undefined {
  const clean = (studentNumber || '').replace(/\D/g, '');
  return REGISTRAR_STUDENTS.find((s) => s.student_number === clean);
}

export function studentFullName(s: RegistrarStudent): string {
  return `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`.trim();
}

// ---------------------------------------------------------------------------
// Human Resources — university staff directory
// ---------------------------------------------------------------------------

/** Positions defined by HR. Staff cannot type their own position; it comes from this list. */
export const STAFF_POSITIONS = [
  'Scholarship Coordinator',
  'Faculty Reviewer',
  'Senior Faculty Reviewer',
  'Scholarship Evaluation Specialist',
  'Financial Aid Officer',
  'Research Grant Specialist',
  'Scholarship Head',
  'System Administrator',
] as const;

export interface HrStaffRecord {
  staff_id: string; // 10 digits, first 4 = year hired
  honorific: string; // Prof., Dr., Engr., Mr., Ms.
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  mobile: string;
  department: string;
  position: (typeof STAFF_POSITIONS)[number];
  employment_status: 'Active' | 'Separated';
  /** Only staff with this flag may be given access to ScholarFlow. */
  scholarship_office_access: boolean;
}

export const HR_STAFF_DIRECTORY: HrStaffRecord[] = [
  { staff_id: '2015000118', honorific: 'Prof.', first_name: 'Corazon', middle_name: 'V.', last_name: 'Santos', email: 'staff@meridian.edu', mobile: '09171002000', department: 'Office of Student Financial Assistance', position: 'Scholarship Head', employment_status: 'Active', scholarship_office_access: true },
  { staff_id: '2018000452', honorific: 'Engr.', first_name: 'Danilo', middle_name: 'M.', last_name: 'Ramos', email: 'interviewer@meridian.edu', mobile: '09187654321', department: 'College of Engineering & Architecture', position: 'Senior Faculty Reviewer', employment_status: 'Active', scholarship_office_access: true },
  { staff_id: '2017000331', honorific: 'Dr.', first_name: 'Carmela', middle_name: 'R.', last_name: 'Alvarez', email: 'carmela.alvarez@meridian.edu', mobile: '09173004000', department: 'Office of Student Affairs', position: 'Scholarship Evaluation Specialist', employment_status: 'Active', scholarship_office_access: true },
  { staff_id: '2019000874', honorific: 'Prof.', first_name: 'Benedict', middle_name: 'A.', last_name: 'Luna', email: 'coordinator@meridian.edu', mobile: '09174005000', department: 'Office of the Scholarship Coordinator', position: 'Scholarship Coordinator', employment_status: 'Active', scholarship_office_access: true },
  { staff_id: '2012000017', honorific: 'Dr.', first_name: 'Raymond', middle_name: 'B.', last_name: 'Miller', email: 'admin@meridian.edu', mobile: '09176007000', department: 'Information Technology Services', position: 'System Administrator', employment_status: 'Active', scholarship_office_access: false },
  { staff_id: '2020001502', honorific: 'Mr.', first_name: 'Leonardo', middle_name: 'P.', last_name: 'Cruz', email: 'leonardo.cruz@meridian.edu', mobile: '09175551001', department: 'College of Engineering & Architecture', position: 'Faculty Reviewer', employment_status: 'Active', scholarship_office_access: true },
  { staff_id: '2021002340', honorific: 'Ms.', first_name: 'Rhea', middle_name: 'D.', last_name: 'Bautista', email: 'rhea.bautista@meridian.edu', mobile: '09175551002', department: 'Office of Student Affairs', position: 'Scholarship Evaluation Specialist', employment_status: 'Active', scholarship_office_access: true },
  { staff_id: '2014000990', honorific: 'Mr.', first_name: 'Roberto', middle_name: 'C.', last_name: 'Villanueva', email: 'roberto.villanueva@meridian.edu', mobile: '09215558877', department: 'Human Resources Department', position: 'Financial Aid Officer', employment_status: 'Separated', scholarship_office_access: false },
];

export function findHrStaff(staffId: string): HrStaffRecord | undefined {
  const clean = (staffId || '').replace(/\D/g, '');
  return HR_STAFF_DIRECTORY.find((s) => s.staff_id === clean);
}

export function findHrStaffByEmail(email: string): HrStaffRecord | undefined {
  const clean = (email || '').trim().toLowerCase();
  return HR_STAFF_DIRECTORY.find((s) => s.email.toLowerCase() === clean);
}

export function staffFullName(s: HrStaffRecord): string {
  return `${s.honorific} ${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`.trim();
}

// ---------------------------------------------------------------------------
// Academic calendar — scholarships are awarded one regular semester at a time
// ---------------------------------------------------------------------------

export interface AcademicTerm {
  id: string;
  label: string; // "1st Semester, A.Y. 2026–2027"
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (grant validity ends here)
}

export const ACADEMIC_TERMS: AcademicTerm[] = [
  { id: '2025-1', label: '1st Semester, A.Y. 2025–2026', start: '2025-08-11', end: '2025-12-19' },
  { id: '2025-2', label: '2nd Semester, A.Y. 2025–2026', start: '2026-01-12', end: '2026-05-22' },
  { id: '2026-1', label: '1st Semester, A.Y. 2026–2027', start: '2026-08-10', end: '2026-12-18' },
  { id: '2026-2', label: '2nd Semester, A.Y. 2026–2027', start: '2027-01-11', end: '2027-05-21' },
  { id: '2027-1', label: '1st Semester, A.Y. 2027–2028', start: '2027-08-09', end: '2027-12-17' },
  { id: '2027-2', label: '2nd Semester, A.Y. 2027–2028', start: '2028-01-10', end: '2028-05-19' },
];

/**
 * The term a grant approved on `date` will cover: the semester in progress, or — if approved
 * during a break — the next semester to start.
 */
export function getAwardTerm(date: Date = new Date()): AcademicTerm {
  const iso = date.toISOString().split('T')[0];
  const current = ACADEMIC_TERMS.find((t) => iso >= t.start && iso <= t.end);
  if (current) return current;
  const next = ACADEMIC_TERMS.find((t) => t.start > iso);
  return next || ACADEMIC_TERMS[ACADEMIC_TERMS.length - 1];
}

export function formatTermRange(t: AcademicTerm): string {
  const f = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${f(t.start)} – ${f(t.end)}`;
}
