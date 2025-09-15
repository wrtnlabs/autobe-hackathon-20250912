## User Roles and Permissions

This document defines the four distinct user roles within the ATS (Applicant Tracking System), including their permitted actions, data access boundaries, and authentication requirements. All permissions are defined in business terms and must be enforced at the application layer. This document serves as the foundation for role-based access control (RBAC), token payload structure, and feature gating logic.

### Role Definition Framework

Each user role is categorized by its `kind` property, which determines its access tier: `guest`, `member`, or `admin`. All roles are authenticated via JWT, and their capabilities are strictly defined by business rules—not system implementation. Role permissions are non-overlapping and logically isolated.

- `guest`: Not used in this system.
- `member`: Has access to functionality relevant to their business function. Can only view and modify data relevant to their own activities or assigned responsibilities.
- `admin`: Has full access to all features, configurations, and data. Overrides all other role restrictions.

All roles must authenticate via email and password or OAuth 2.0. No role may perform actions outside its defined scope.

### HR Recruiter Profile

The HR Recruiter is responsible for managing the end-to-end hiring process. This role is granted access to all candidate data and hiring workflow controls, but may not change system configurations.

#### What the HR Recruiter CAN Do:
- Register and publish new job postings with title, description, required skills, and department.
- View all submitted applications for posted jobs.
- Upload, view, and download resumes and cover letters in PDF or Word format.
- Manually override automated tech stack matching results.
- View candidate status history (e.g., "Submitted" → "Coding Test Passed" → "Interview Scheduled").
- Manually update candidate status to any stage in the pipeline.
- Schedule interviews by selecting available time slots from applicants’ and technical reviewers’ calendars.
- Send automated interview invitation and reminder notifications via email or SMS.
- Generate and export candidate lists in CSV or Excel format.
- View technical reviewer feedback on coding tests.

#### What the HR Recruiter CANNOT Do:
- Delete or modify any job posting once applications have been submitted.
- Access or edit user accounts of other system users.
- Change system-wide settings such as notification templates or Google Calendar integration.
- Access data of applicants who have not applied to any job they manage.
- Rerun or modify automated parsing or tech stack matching algorithms.
- View the full list of all system users or roles.

#### JWT Payload Expectations:
```json
{
  "userId": "uuid-v4",
  "role": "hrRecruiter",
  "permissions": ["view_applicants", "edit_applicant_status", "schedule_interview", "export_candidates", "view_tech_feedback", "create_job_posting"]
}
```

### Applicant Profile

The Applicant is an external candidate seeking employment. This role has access only to their personal data and active job postings.

#### What the Applicant CAN Do:
- Register an account using an email address and password.
- Verify their email address via confirmation link.
- Upload their resume or CV in PDF or Microsoft Word (.docx) format.
- Apply to one or more open job postings.
- View the status of their application (e.g., "Submitted", "Under Review", "Interview Assigned").
- View scheduled interview times, including date, time, and participant names.
- Receive automated notifications about application status changes, interview reminders, and outcomes.
- Edit their resume or personal details (name, email, phone) before submitting an application.
- Cancel their application (before interview stage).

#### What the Applicant CANNOT Do:
- View other applicants’ resumes, statuses, or contact information.
- Access job postings that are not publicly active.
- Schedule or modify interviews.
- Download or export any system data.
- Contact recruiters or technical reviewers directly through the system.
- Access administrative or configuration panels.

#### JWT Payload Expectations:
```json
{
  "userId": "uuid-v4",
  "role": "applicant",
  "permissions": ["view_own_profile", "upload_resume", "apply_to_job", "view_own_applications", "view_own_interviews", "receive_notifications"]
}
```

### Technical Reviewer Profile

The Technical Reviewer evaluates candidates’ coding skills based on automated test results and resume analysis. This role has no access to scheduling or HR functions.

#### What the Technical Reviewer CAN Do:
- View all coding test submissions for job postings they are assigned to.
- Access the programming problem definitions and scoring rubrics.
- View candidate’s uploaded resume (PDF/Word) and automated tech stack extraction.
- Submit a scored evaluation with pass/fail verdict and written feedback.
- View the candidate’s overall application status (but cannot update it).
- Receive notifications when a new coding test is submitted for review.
- View their own reviewing history and average evaluation score.

#### What the Technical Reviewer CANNOT Do:
- Schedule or modify interviews.
- Contact applicants directly.
- Edit or delete any job postings.
- View applicants’ contact information (email/phone) unless it’s explicitly extracted from resume.
- Export candidate data.
- Review candidates who applied to jobs they are not assigned to.

#### JWT Payload Expectations:
```json
{
  "userId": "uuid-v4",
  "role": "technicalReviewer",
  "permissions": ["view_resumes", "view_coding_tests", "submit_evaluation", "view_assigned_candidates", "receive_test_submissions"]
}
```

### System Admin Profile

The System Administrator manages the entire ATS configuration, user accounts, external integrations, and security policies.

#### What the System Admin CAN Do:
- Add, edit, deactivate, or delete any user account.
- Assign or change user roles (hrRecruiter, applicant, technicalReviewer).
- Configure all system-wide settings:
  - Notification templates (email and SMS)
  - Job posting approval workflows
  - Coding test problem library
  - Export format defaults (CSV/Excel)
- Enable or disable external integrations:
  - Google Calendar API
  - Email service provider (e.g., SendGrid)
  - Resume parsing service (e.g., Paragon)
- Manage OAuth 2.0 identity providers for login.
- Run system audits and view access logs.
- View all data across all roles and candidates.
- Force-reset passwords for any user.
- Enable or disable AI-based interview question generation.

#### What the System Admin CANNOT Do:
- Make business decisions on candidate selection or hiring.
- Modify or delete job postings.
- Access other users' personal information without explicit necessity.
- Disable the system’s audit logging functionality.
- Bypass role-based access controls by directly manipulating data.
- Remove the system admin role from the last active admin account.

#### JWT Payload Expectations:
```json
{
  "userId": "uuid-v4",
  "role": "systemAdmin",
  "permissions": ["manage_users", "configure_system", "manage_integrations", "view_all_data", "reset_passwords", "modify_ai_settings", "view_audit_logs"]
}
```

## Business Logic and Access Boundary Enforcement

### Role Isolation

Data isolation is strictly enforced to prevent role overlap:

- HR Recruiters may view applicants for job postings they created, but may not view applicants for postings created by other recruiters unless granted explicit organizational permissions by a system admin.
- Technical Reviewers may review only candidates explicitly assigned to them for evaluation; they have no access to job posting creation, scheduling, or candidate contact information.
- Applicants may view only their own profile, applications, and interviews.
- System Admins are the only role with access to the user management system and may view or modify data across all roles.

### Permission Escalation

Permission escalation is not permitted via indirect means:

- A Technical Reviewer may not request temporary HR permissions.
- An HR Recruiter may not manually override role assignments.
- A System Admin may only elevate or degrade permissions via the official user management interface—never by direct database or data access layer manipulation.

### Business Rule Examples

- IF a candidate’s resume has been uploaded by an applicant, THEN THE system SHALL make the resume data accessible only to HR Recruiters and Technical Reviewers assigned to evaluating that candidate, and to the System Admin.
- IF an HR Recruiter attempts to edit another recruiter’s job posting, THEN THE system SHALL return HTTP 403 Forbidden.
- IF a Technical Reviewer attempts to schedule an interview, THEN THE system SHALL return HTTP 403 Forbidden and display "Interview scheduling is restricted to HR Recruiters."
- IF an Applicant attempts to access the system admin dashboard, THEN THE system SHALL redirect to their personal profile and log the event as "Unauthorized Access Attempt."

## Related Document Dependencies

This document is a foundational requirement reference for the following related documents:

- [Functional Requirements Document](./03-functional-requirements.md) — Defines the system behavior triggered by each role’s permitted actions.
- [Integration Requirements Document](./05-integration-requirements.md) — Specifies how external services (e.g., Google Calendar) interact with role-bound actions.
- [Authentication & Authorization Document](./06-business-rules.md) — Defines the rules for JWT validation, session management, and permission checking.
- [Error and Exception Handling Document](./07-error-handling.md) — Describes user-facing responses when permission violations occur.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*