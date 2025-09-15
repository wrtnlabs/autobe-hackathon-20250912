## Performance Expectations

This document defines the measurable performance criteria from the end-user’s perspective to guide system design, infrastructure scaling, and optimization priorities. All requirements are expressed in terms of user experience, not technical architecture or implementation details.

### Response Time Expectations

Response times must feel instantaneous or predictable to users. Delays beyond these thresholds will degrade usability and trust.

WHEN an HR recruiter searches for candidates by skill (e.g., "Node.js"), THE system SHALL return results within 2 seconds.
WHEN an applicant uploads a resume in PDF or Word format, THE system SHALL acknowledge receipt and begin parsing within 5 seconds.
WHEN a technical reviewer opens a candidate’s coding test results, THE system SHALL display scores, code snippets, and feedback within 3 seconds.
WHEN a system admin loads the user management dashboard, THE system SHALL render all user lists, roles, and permissions within 4 seconds.
WHEN any user logs in or refreshes their session, THE system SHALL authenticate and redirect to the home dashboard within 2 seconds.
WHEN a candidate views their application status or interview schedule, THE system SHALL load their personal data within 2 seconds.
WHEN the system generates AI-recommended interview questions from a resume, THE system SHALL return the list within 8 seconds.

### System Availability

The ATS system must be reliably accessible during standard business hours to support hiring workflows.

WHILE the system is in active use (7:00 AM – 10:00 PM KST, Monday to Friday), THE system SHALL maintain 99.5% uptime.
WHILE the system is in active use (7:00 AM – 10:00 PM KST, Saturday to Sunday), THE system SHALL maintain 99.0% uptime.
IF the system becomes unavailable during business hours, THE system SHALL automatically notify system admins via email and internal dashboard alert within 1 minute of the outage.
IF the system undergoes scheduled maintenance, THE system SHALL display a user-friendly maintenance message at least 24 hours in advance.

### Concurrency Requirements

The system must handle simultaneous usage without noticeable degradation in performance.

WHILE 100 HR recruiters are actively searching, filtering, or updating candidate statuses concurrently, THE system SHALL maintain all defined response time expectations.
WHILE 500 applicants are submitting resumes or applying to jobs concurrently, THE system SHALL accept and queue all uploads without rejecting requests or showing server errors.
WHILE 20 technical reviewers are evaluating coding test submissions concurrently, THE system SHALL display evaluation interfaces and results without delay or data corruption.
WHILE 10 system admins are managing roles, permissions, or integrations concurrently, THE system SHALL process configuration changes without locking or timeout.

### Data Export Performance

Exporting candidate data must complete within reasonable timeframes to support reporting and compliance.

WHEN an HR recruiter exports a list of 1,000 candidates in CSV format, THE system SHALL generate and make available the file within 30 seconds.
WHEN an HR recruiter exports a list of 10,000 candidates in Excel (.xlsx) format, THE system SHALL generate and make available the file within 3 minutes.
IF the export request exceeds 20,000 candidates, THE system SHALL inform the user that the request is too large and offer to split it into batches or schedule it for off-peak processing.

### Notification Delay Expectations

Automated notifications must be delivered promptly to ensure timely communication with candidates and internal staff.

WHEN an interview schedule is confirmed by an HR recruiter, THE system SHALL send the email and SMS notification to the applicant and interviewer within 90 seconds.
WHEN an applicant’s status changes (e.g., "Rejected" or "Offer Sent"), THE system SHALL send the corresponding notification within 2 minutes.
WHEN a coding test result is saved by a technical reviewer, THE system SHALL notify the applicant and HR recruiter within 120 seconds.
IF an email notification fails to send, THE system SHALL retry delivery up to 3 times within the next hour and notify the HR recruiter in the dashboard if all attempts fail.
WHEN a calendar invitation is synced via Google Calendar, THE system SHALL create or update the event on the user’s calendar within 60 seconds of confirmation.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*