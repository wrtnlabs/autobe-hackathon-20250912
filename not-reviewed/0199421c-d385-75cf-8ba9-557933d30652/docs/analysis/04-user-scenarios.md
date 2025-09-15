## Functional Requirements

This document defines all business requirements for the ATS (Applicant Tracking System) using EARS (Easy Approach to Requirements Syntax) format. All requirements are written in natural language from the perspective of user actions and system behavior, with EARS keywords in English and all descriptive content in English. This document is the single source of truth for backend developers implementing core features. No technical implementation details (APIs, databases, frameworks) are specified—only what the system must do.

---

### Authentication & Session Management

- THE system SHALL require all users to authenticate via email and password or OAuth 2.0 provider before accessing any feature.
- WHEN a user logs in, THE system SHALL issue a JWT access token with a 15-minute expiration and a refresh token with a 30-day expiration.
- WHEN a user’s access token expires, THE system SHALL allow renewal using the refresh token if it is valid and not revoked.
- WHILE a user is authenticated, THE system SHALL maintain an active session and protect all endpoints with token validation.
- IF a user attempts to access a resource without a valid token, THEN THE system SHALL return HTTP 401 with error code ‘AUTH_TOKEN_INVALID’.
- IF a user tries to access a resource outside their role permissions, THEN THE system SHALL return HTTP 403 with error code ‘AUTH_PERMISSION_DENIED’.
- THE system SHALL allow users to revoke all active sessions from their profile settings.
- THE system SHALL audit and log all login attempts, including success, failure, and IP address.

---

### Resume Upload and Parsing

- WHEN a candidate uploads a resume in PDF or DOCX format, THE system SHALL accept the file if it is under 5 MB and has a valid extension.
- IF a candidate uploads a file with an invalid extension (e.g., .txt, .jpg), THEN THE system SHALL reject the upload and display “Only PDF and DOCX files are allowed.”
- IF a candidate uploads a malformed or corrupted file, THEN THE system SHALL reject the upload and display “The file appears to be corrupted or unreadable.”
- WHEN a valid resume is uploaded, THE system SHALL automatically extract the following fields: full name, email address, phone number, current job title, previous job titles, education history, and years of experience.
- WHERE the system cannot extract a required field (e.g., email), THEN THE system SHALL mark the resume as “Incomplete” and notify the candidate to re-upload.
- THE system SHALL store the original file securely and retain a parsed JSON representation of resume data.
- THE system SHALL not store or process resumes from unauthenticated candidates.

---

### Tech Stack Extraction and Matching

- WHEN the system processes a parsed resume, THE system SHALL scan all text fields for mentions of common technical skills such as programming languages (e.g., Python, JavaScript), frameworks (e.g., React, Node.js), tools (e.g., Docker, AWS), and methodologies (e.g., Agile, CI/CD).
- THE system SHALL maintain a dynamic, configurable master list of recognized tech stack terms.
- WHEN a job posting is created with required tech skills, THE system SHALL match candidate resumes against these requirements and assign a skill match percentage based on overlap.
- WHERE a resume contains the exact term “Node.js” and a job requires “Node.js”, THE system SHALL increment the match score by 10 points.
- WHERE a resume contains a related term such as “JavaScript” and a job requires “Node.js”, THE system SHALL increment the match score by 5 points.
- THE system SHALL highlight matched skills in the HR recruiter’s review interface and display unmatched skills separately.
- THE system SHALL not infer skills from non-technical context (e.g., “worked on a project with React” does not imply hands-on experience).

---

### Job Posting Management

- WHEN an HR recruiter creates a new job posting, THE system SHALL require the following fields: title, department, location (city or remote), description, minimum experience level, and required tech skills.
- THE system SHALL allow HR recruiters to edit job postings until the first application is submitted.
- IF an HR recruiter attempts to edit a job posting after an application is received, THEN THE system SHALL prevent editing of the job title, department, location, and required tech skills.
- WHEN a job posting is archived, THE system SHALL no longer accept new applications but retain existing ones for review.
- THE system SHALL display active job postings to applicants in a searchable, filterable list.
- WHERE a job posting has expired (date set by HR), THEN THE system SHALL automatically archive it and notify applicants that the role is no longer available.
- THE system SHALL maintain a count of applicants per job posting and display it in the recruiter dashboard.

---

### Coding Test Automation

- WHEN an HR recruiter selects a candidate to move to the coding test stage, THE system SHALL generate a unique, time-limited coding challenge link for the candidate.
- THE system SHALL provide a default assessment consisting of a single backend problem (e.g., “Build a REST API endpoint that returns paginated user data with filtering by role”).
- WHEN a candidate accesses the coding test link, THE system SHALL start a 90-minute timer and lock the environment to prevent external resource access.
- THE system SHALL automatically score the candidate’s submission based on test coverage, correctness, readability, and code structure.
- WHEN a candidate submits their code, THE system SHALL send a notification to the technical reviewer with the score, submission link, and a summary of test results.
- THE system SHALL store all code submissions securely and prevent access by anyone except assigned technical reviewers and system administrators.
- IF a candidate fails to submit before the timer expires, THEN THE system SHALL auto-submit their current work and mark submission status as “Timed Out.”

---

### Interview Scheduling

- WHEN an HR recruiter selects a candidate to proceed to interview, THE system SHALL prompt for preferred dates and times from both the recruiter and candidate.
- THE system SHALL synchronize the recruiter’s and candidate’s calendar availability by integrating with Google Calendar (see Integration Requirements).
- WHILE both parties have overlapping availability, THE system SHALL recommend the earliest common slot and allow the recruiter to confirm it.
- WHEN an interview slot is confirmed, THE system SHALL create a Google Calendar event with title, description, Zoom/Teams link (pre-configured), and automatic invitations to both parties.
- IF a candidate cancels their interview, THEN THE system SHALL notify the recruiter and suggest alternative dates based on updated availability.
- IF an HR recruiter cancels, THE system SHALL notify the candidate and offer a new window from their available times.
- THE system SHALL not allow scheduling conflicts within the same user’s calendar.
- THE system SHALL send a reminder email and SMS 24 hours and 1 hour before the scheduled interview.

---

### Candidate Status Tracking

- THE system SHALL define the following status pipeline for all candidates: “Application Received” → “Resume Evaluated” → “Coding Test Assigned” → “Coding Test Completed” → “Interview Scheduled” → “Interview Completed” → “Offer Extended” → “Hired” or “Rejected.”
- WHEN a candidate’s status changes, THE system SHALL automatically log the change, the user who made it, and the timestamp.
- IF a candidate’s resume fails parsing, THEN THE system SHALL set their status to “Resume Incomplete” and prevent progression.
- IF a candidate’s coding test score is below the configured threshold (e.g., 60%), THEN THE system SHALL automatically set their status to “Rejected” and notify them.
- IF a candidate completes all interviews and the hiring manager approves, THEN THE system SHALL allow HR recruiter to change status to “Offer Extended.”
- WHERE a status change requires human approval (e.g., moving from “Interview Completed” to “Offer Extended”), THE system SHALL require a manual toggle with audit trail.
- THE system SHALL display the candidate’s current status prominently to all authorized users.

---

### Notifications and Alerts

- WHEN a candidate submits a resume, THE system SHALL trigger an email notification to the assigned HR recruiter with the subject: “New Application: [Candidate Name] for [Job Title].”
- WHEN a coding test is completed, THE system SHALL send an email and SMS alert to the assigned technical reviewer.
- WHEN an interview is scheduled, THE system SHALL send a calendar invitation, email, and SMS to both candidate and recruiter.
- WHEN an interview is canceled or rescheduled, THE system SHALL notify both parties via email and SMS.
- WHEN a candidate is rejected, THE system SHALL send an automated email with the subject: “Update on Your Application for [Job Title].”
- WHEN a candidate is offered a position, THE system SHALL notify them via email with a personalized message and next steps.
- WHEN a resume parse failure occurs, THE system SHALL notify the candidate via email with instructions to re-upload.
- THE system SHALL allow users to toggle notification preferences for email and SMS in their profile settings.

---

### Data Export Functionality

- WHEN an HR recruiter clicks “Export Candidates”, THE system SHALL generate a CSV or Excel file containing all candidate data for selected job postings.
- THE exported file SHALL include: candidate name, email, phone, applied job title, current status, skill match score, coding test score, interview status, and application date.
- THE system SHALL exclude sensitive data such as full resume text or access tokens from exports.
- THE system SHALL limit export generation to one file per 10 minutes to prevent server overload.
- WHEN export generation completes, THE system SHALL notify the recruiter via email with a time-limited (24-hour) download link.
- THE system SHALL log all export requests for audit purposes.

---

### External Calendar Integration

- WHEN a recruiter schedules an interview, THE system SHALL communicate with the Google Calendar API to create, update, or cancel calendar events.
- THE system SHALL authenticate with Google Calendar using OAuth 2.0 authorized by each HR recruiter’s Google account (individual token storage).
- WHERE a calendar sync fails (e.g., network timeout or invalid token), THEN THE system SHALL log the failure, notify the recruiter via dashboard alert, and allow manual scheduling override.
- THE system SHALL read the recruiter’s and candidate’s default calendar availability (work hours, time zones) and use it to recommend interview slots.
- WHEN a candidate updates their availability in Google Calendar, THE system SHALL poll their calendar every 15 minutes for changes (based on permissions granted).
- THE system SHALL never write to or modify any calendar event or detail outside the scope of ATS-managed interviews.

---

### AI Interview Question Recommendation

- WHEN a technical reviewer opens a candidate’s profile, THE system SHALL analyze the resume and coding test submission to generate 3–5 tailored interview questions.
- THE system SHALL use natural language processing to identify candidate’s skill depth, experience level, and project context from resume and code.
- WHERE a candidate mentions “built a scalable microservices system using Node.js and Docker”, THE system SHALL recommend: “Explain how you handled service discovery and load balancing in this system.”
- WHERE a candidate’s code has poor error handling, THE system SHALL recommend: “How would you handle a database connection failure in production?”
- THE system SHALL not recommend questions that are purely theoretical or unrelated to the candidate’s stated experience.
- THE system SHALL allow the technical reviewer to modify, remove, or add custom questions, and shall save those changes to the candidate’s file.
- THE system SHALL use an internal, fine-tuned model trained on engineering interview best practices, and shall not send resume data to third-party AI APIs.