export type UserRole = 'student' | 'staff' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  role: UserRole;
  /** Staff ID (HR) or Student Number (Registrar) the account is bound to. */
  university_id?: string;
  /** Students only: enrolled degree program pulled from the Registrar. */
  program?: string;
  year_level?: string;
  /** True when the stored password predates the strong-password policy and must be changed at next sign-in. */
  must_change_password?: boolean;
  last_login_at?: string;
  title?: string;
  department?: string;
  phone?: string;
  active_session_token?: string;
  known_device_ids?: string[];
  security_questions?: { question: string; answer: string }[];
  security_questions_setup?: boolean;
  created_at: string;
  updated_at?: string;
}

export type ScholarshipCategory = 'Academic' | 'Financial' | 'Athletic' | 'Alumni' | 'Industry' | 'Leadership' | 'Performing Arts' | 'Research' | 'Community';

export interface Scholarship {
  id: string;
  title: string;
  code: string;
  description: string;
  category: ScholarshipCategory;
  slots: number;
  slots_remaining: number;
  grant_amount: number; // in PHP ₱
  grant_type: string; // e.g. "100% Tuition Waiver + ₱15,000 Allowance"
  min_gwa: number; // Mapúa grading scale (1.00 is top, 1.75 etc.)
  max_family_income: number; // in PHP ₱ (Annual Gross Family Income limit)
  deadline: string;
  requirements: string[];
  is_active: boolean;
  is_frozen: boolean;
  freeze_note?: string;
  created_at: string;
  // --- Policy Rules ---
  duration_years: number;           // How many school years the grant covers (e.g. 1, 2, 4)
  is_renewable: boolean;            // Whether scholars can renew after the term ends
  renewal_deadline?: string;        // Deadline for submitting renewal application (YYYY-MM-DD)
  max_approved_per_student?: number; // Hardcoded global rule: 1 active grant per student
  // --- Program eligibility & quota rules ---
  /** Degree programs allowed to apply. Empty/undefined = open to all programs offered by the university. */
  eligible_programs?: string[];
  /** Application quota per program (program name -> max active applications). */
  program_quotas?: Record<string, number>;
  /** Year levels allowed to apply (e.g. ['3rd Year','4th Year']). Empty = all year levels. */
  eligible_year_levels?: string[];
  /** Smallest amount a reviewer may award for this program, per term (PHP). */
  min_grant_amount?: number;
}

export interface HouseholdMember {
  id: string;
  /** Whether this member earns income. Earners need proof of income; non-earners need a certificate of no income. */
  employment_status?: 'Employed' | 'Self-employed' | 'OFW' | 'Pensioner' | 'Unemployed';
  name?: string; // composite full name for backward compatibility
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  relation: string;
  occupation: string;
  monthly_income: number;
  annual_income?: number; // Declared Annual Income in PHP ₱
}

export interface ApplicationDocument {
  id: string;
  type: 'com' | 'itr' | 'id' | 'other';
  /** Requirement this file satisfies, e.g. "Certificate of Enrollment" or "Proof of income — Robert Vance (Father)". */
  label?: string;
  /** Short requirement code used in the standard filename, e.g. COE, TOR, ITR-FATHER. */
  requirement_code?: string;
  /** Filename exactly as uploaded by the student (the stored name follows the standard format). */
  original_name?: string;
  /** Set by staff after checking the document. */
  verified?: boolean;
  name: string;
  url: string;
  size: string;
  uploaded_at: string;
  file_type?: string;
  data_url?: string;
}

export type ApplicationStatus =
  | 'Pending'
  | 'In Review'
  | 'Shortlisted'
  | 'For Approval'  // Endorsed by staff; waiting for an administrator's final approval
  | 'Approved'
  | 'Rejected'
  | 'For Renewal'   // Approved term expiring — renewal window open
  | 'Expired'       // Term ended, no renewal submitted in time
  | 'Removed';      // Scholar removed due to policy failure (GWA drop, etc.)

export interface Application {
  id: string;
  reference_code: string; // e.g., AMOSA-982F1A03
  scholarship_id: string;
  scholarship_title: string;
  student_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  birthdate?: string;
  email: string;
  phone: string;
  program: string;
  year_level: string;
  gwa: number;
  monthly_family_income: number;
  annual_family_income?: number;
  is_working_student?: boolean;
  student_annual_income?: number;
  household_members: HouseholdMember[];
  documents: ApplicationDocument[];
  status: ApplicationStatus;
  awarded_amount: number; // in PHP ₱
  remarks: string; // Visible to student
  staff_notes?: string; // Internal staff notes
  // --- Lifecycle Tracking ---
  approved_at?: string;    // ISO timestamp when Approved status was set
  approved_by?: string;    // Full name and role of the admin/staff coordinator who approved
  approved_by_id?: string; // ID/staff ID of the approver
  expires_at?: string;     // ISO date when the scholarship term ends (approved_at + duration_years)
  removal_reason?: string; // Reason when status is set to 'Removed'
  grant_term?: string;     // Academic term the award covers, e.g. "1st Semester, A.Y. 2026–2027"
  endorsed_by?: string;    // Staff member who endorsed the applicant for approval
  endorsed_at?: string;
  /** Answers to program-specific screening questions (question id -> answer). */
  screening_answers?: Record<string, string>;
  /** Staff review saved as a draft (not yet visible to the student). */
  review_draft?: ReviewDraft;
  is_renewal?: boolean;    // true if this application is a renewal of a previous one
  renewed_from?: string;   // reference_code of the original application being renewed
  created_at: string;
  updated_at: string;
}

export interface ReviewDraft {
  status: ApplicationStatus;
  awarded_amount: number;
  remarks: string;
  staff_notes: string;
  verified_document_ids: string[];
  saved_by: string;
  saved_at: string;
}

export interface FreezePeriod {
  id: string;
  scholarship_id: string; // 'all' or specific scholarship ID
  scholarship_title?: string;
  start_date: string;
  end_date: string;
  announcement_note: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export interface InterviewSchedule {
  id: string;
  application_id: string;
  student_name: string;
  scholarship_title: string;
  date_time: string;
  location: string;
  interviewer: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export type StaffApplicationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface StaffApplication {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name?: string;
  email?: string;
  institutional_email?: string;
  phone?: string;
  phone_number?: string;
  birthdate: string;
  staff_id?: string;
  staff_id_number?: string; // Exactly 10 digits
  department: string;
  position: string;
  status: StaffApplicationStatus;
  created_at: string;
  updated_at?: string;
  reviewed_at?: string;
  admin_remarks?: string;
  admin_notes?: string;
  assigned_username?: string; // Login email / username assigned upon approval
  assigned_password?: string; // Generated password for initial staff access
  credentials_retrieved?: boolean;
  credentials_viewed?: boolean;
}

