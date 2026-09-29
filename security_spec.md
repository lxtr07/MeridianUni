# ScholarFlow Security Specification & Hardened Test Vectors

## Phase 0: Security TDD & Invariants

### 1. Data Invariants
1. **Scholarship Quotas & Immutability**:
   - `slots_remaining` cannot exceed `slots` or be negative.
   - Any modification to `id` or `created_at` on an existing scholarship is forbidden.
   - Scholarship catalog is publicly readable by students and applicants for transparency.
   - Updates, deletions, and additions are restricted to administrative/staff actions.

2. **Application Integrity**:
   - Each application must contain valid student identification (`student_number`, `first_name`, `last_name`, `email`).
   - Applicants can submit new applications with status initialized to `'Pending'`.
   - Modifying an existing application's `status`, `awarded_amount`, or `staff_notes` is restricted to authorized staff/reviewers.
   - `reference_code` must match alphanumeric format `^[a-zA-Z0-9_-]+$`.

3. **Emergency Freeze Periods**:
   - Emergency freeze records must reference either a valid scholarship ID or `'all'`.
   - Freeze records cannot be created with unbounded arbitrary text payloads.

4. **Interviews**:
   - Interview records link an `application_id` to a scheduled date/time and coordinator.

---

### 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Privilege Escalation - Role Injection in Application)**:
   - Injecting `role: "admin"` into a student application submission.
   - *Expected Result*: Rejected (fields not permitted in application schema).

2. **Payload 2 (Ghost Field Injection - Shadow Update)**:
   - Sending `{ ...validApplication, isApprovedSecretly: true, bypassReview: true }`.
   - *Expected Result*: Rejected (violates schema validation).

3. **Payload 3 (Denial of Wallet - 1MB String in Scholarship Title)**:
   - Submitting a scholarship title with 1,000,000 characters.
   - *Expected Result*: Rejected (`size() <= 200` constraint violation).

4. **Payload 4 (Terminal State Bypass)**:
   - Updating an already Approved or Rejected application to 'Pending' without authorization.
   - *Expected Result*: Rejected.

5. **Payload 5 (Negative Quota Attack)**:
   - Setting `slots_remaining: -50`.
   - *Expected Result*: Rejected.

6. **Payload 6 (Student Number Identity Spoofing)**:
   - Blank or malicious regex student number `../../../admin`.
   - *Expected Result*: Rejected.

7. **Payload 7 (Arbitrary Document Deletion)**:
   - Unauthenticated client attempting `deleteDoc(doc(db, 'scholarships', 'sch-001'))`.
   - *Expected Result*: Rejected.

8. **Payload 8 (Arbitrary Reviewer Note Tampering)**:
   - Student modifying `staff_notes` or `awarded_amount` during status check.
   - *Expected Result*: Rejected.

9. **Payload 9 (Orphaned Interview Slot)**:
   - Scheduling an interview with non-existent or empty `application_id`.
   - *Expected Result*: Rejected.

10. **Payload 10 (Freeze Period Duration Overflow)**:
    - Injecting 500KB JSON payload into `announcement_note`.
    - *Expected Result*: Rejected (`size() <= 1000`).

11. **Payload 11 (Unauthenticated Scholarship Wipe)**:
    - Anonymous or untrusted client calling `delete` on `/scholarships`.
    - *Expected Result*: Rejected.

12. **Payload 12 (Invalid Status State Transition)**:
    - Setting application `status: "HACKED_APPROVED"`.
    - *Expected Result*: Rejected (must be in enum `['Pending', 'In Review', 'Shortlisted', 'Approved', 'Rejected']`).
