import { Application } from '../types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  canReapply?: boolean;
  previousApp?: Application;
  existingApp?: Application;
  matchType?: 'both' | 'email' | 'student_number';
  message: string;
}

/**
 * Validates if an applicant has already applied for the scholarship program
 * based on their institutional email address or student ID number.
 * 
 * Rules:
 * 1. Blocks duplicate submissions for the same program.
 * 2. Exception: Allowed to re-apply if previous application for that program is 'Removed', 'Expired', or 'Rejected'.
 * 3. Enforces global 1 active application/grant per student restriction.
 */
export function checkDuplicateApplication(
  applications: Application[],
  scholarshipId: string,
  email?: string,
  studentNumber?: string,
  isRenewal: boolean = false
): DuplicateCheckResult {
  const normEmail = email?.trim().toLowerCase();
  const cleanId = studentNumber?.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!normEmail && !cleanId) {
    return { isDuplicate: false, message: '' };
  }

  // Find all applications for this student
  const studentApps = applications.filter((app) => {
    const appEmail = app.email?.trim().toLowerCase();
    const appCleanId = app.student_number?.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const emailMatch = Boolean(normEmail && appEmail && appEmail === normEmail);
    const idMatch = Boolean(cleanId && appCleanId && appCleanId === cleanId);

    return emailMatch || idMatch;
  });

  // Check applications for the SAME scholarship program
  const sameProgramApp = studentApps.find((app) => app.scholarship_id === scholarshipId);

  if (sameProgramApp) {
    const blockedStatuses = ['Pending', 'In Review', 'Approved', 'Shortlisted', 'For Approval'];
    const reapplyStatuses = ['Expired', 'Removed', 'Rejected', 'For Renewal'];
    const currentStatus = sameProgramApp.status;

    if (blockedStatuses.some(s => s.toLowerCase() === currentStatus.toLowerCase())) {
      return {
        isDuplicate: true,
        existingApp: sameProgramApp,
        message: `Reapplication Blocked: You currently have an active application (${sameProgramApp.reference_code}) with status "${currentStatus}". Reapplication is strictly blocked for students with Pending, In Review, Approved, or Shortlisted status.`,
      };
    }

    if (reapplyStatuses.some(s => s.toLowerCase() === currentStatus.toLowerCase())) {
      // Allowed to re-apply / renew!
      return {
        isDuplicate: false,
        canReapply: true,
        previousApp: sameProgramApp,
        message: `Eligible for re-application / renewal: Previous application ${sameProgramApp.reference_code} has status "${currentStatus}".`,
      };
    }
  }

  // Global 1-per-student limit: check if student has an active application elsewhere
  const activeStatuses = ['Pending', 'In Review', 'Shortlisted', 'For Approval', 'Approved'];
  const otherActiveApp = studentApps.find((app) => app.scholarship_id !== scholarshipId && activeStatuses.includes(app.status));
  if (otherActiveApp && !isRenewal) {
    return {
      isDuplicate: true,
      existingApp: otherActiveApp,
      message: `Student ID "${studentNumber}" already has an active application (${otherActiveApp.scholarship_title} - Status: ${otherActiveApp.status}). Every student is restricted to 1 active application/grant at a time.`,
    };
  }

  return { isDuplicate: false, message: '' };
}
