# ScholarFlow Software Requirements Specification (SRS)

## 1. Introduction
ScholarFlow is an institutional academic scholarship and financial aid management platform designed for paperless grant processing, transparent evaluations, real-time student application tracking, and administrative control.

---

## 3. System Features & Operational Requirements

### 3.1 Authentication & System Administration

#### 3.1.1 System Login & Authentication
- **Scope**: Authenticated access is required **exclusively** for Staff Coordinators and System Administrators.
- **Student Access**: Student applicants **do not require an account or login**. Students access the public application wizard directly to complete paperless submissions and track their real-time application status using a unique reference code.
- **Staff & Admin Authentication**:
  - Staff Coordinators and Administrators sign in using institutional credentials (email and password).
  - Passwords are verified against secure SHA-256 password digests.
  - User sessions are persistent across browser refreshes (`F5`), maintaining active dashboard access until an explicit logout is initiated.

#### 3.1.5 System Audit Logs & Activity Monitoring
- **Administrator Audit Dashboard**: System Administrators must be provided with a dedicated **System Logs** view within the Admin Dashboard.
- **Log Capabilities**:
  - Record real-time audit entries for system authentication events, scholarship catalog modifications, application status evaluations, emergency freeze actions, and security policy checks.
  - Provide filter options by event severity (Info, Warning, Security, System) and search capabilities.
  - Support log export and security clearing options.

---

## 4. Security & Access Control

### 4.1 Access Restrictions & Role-Based Permissions
- **Public / Student Role**: Access is restricted strictly to viewing open scholarship catalogs, submitting new applications, uploading supporting documents, and checking status via reference codes. Access to internal reviewer notes or staff management panels is denied.
- **Staff Coordinator Role**: Authorized to review student application queues, update evaluation statuses (`Pending`, `In Review`, `Shortlisted`, `Approved`, `Rejected`), attach student-visible remarks and internal coordinator notes, schedule interview dates, manage application deadlines, and trigger emergency freeze/extension periods.
- **System Administrator Role**: Full access including Staff permissions plus managing scholarship catalog programs, adding/editing staff user accounts, viewing system logs, resetting default program catalogs, and reviewing system-wide financial fund analytics.

---

## 5. System Features Specification

### 5.1 Emergency Freeze & Deadline Extension
- Staff Coordinators and Administrators can activate an Emergency Freeze on specific scholarship programs or universally across all open programs.
- When an Emergency Freeze is active:
  - An announcement banner is immediately broadcasted across the Student Applicant Portal.
  - Applications for targeted programs are temporarily paused, preventing new submissions.
- **Unfreeze / Resume Operations**: Staff and Admin users can lift an emergency freeze at any time to resume open student submissions and clear announcement notes.

### 5.2 Calendar & Deadlines Management
- Unified dashboard view displaying upcoming scholarship program deadlines, active interview schedules, and application queue cutoff dates.
- All system dates across Application Queue, Deadlines, and Emergency Freeze modules use a uniform, standard date format (`MMM D, YYYY`).

### 5.3 Applicant Directory & Review Workflow
- Comprehensive directory of submitted student applications with real-time status filtering (`Pending`, `In Review`, `Shortlisted`, `Approved`, `Rejected`).
- Supports in-depth document inspection (COM, ITR, Student ID), household income verification, awarded grant assignment, and dynamic slot restoration upon application record deletion.
