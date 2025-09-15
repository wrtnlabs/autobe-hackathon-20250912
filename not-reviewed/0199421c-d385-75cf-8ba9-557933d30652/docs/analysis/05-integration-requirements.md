## Google Calendar Integration

### Business Purpose
The ATS system must synchronize interview scheduling with Google Calendar to eliminate manual calendar management, reduce scheduling conflicts, and provide candidates and recruiters with a single source of truth for interview appointments. This integration ensures that all interview times are automatically reflected in both the ATS and the users' personal or team Google Calendars, preventing double-booking and reducing administrative overhead.

### Data Exchange Requirements
- WHEN an HR recruiter schedules a new interview in the ATS, THE system SHALL create a corresponding calendar event in the interviewer's and candidate's Google Calendar.
- WHEN an interview is modified in the ATS (date, time, location, or participants change), THE system SHALL update the corresponding calendar event in Google Calendar.
- WHEN an interview is cancelled in the ATS, THE system SHALL delete or mark as cancelled the corresponding calendar event in Google Calendar.
- THE system SHALL transmit the following structured event data to Google Calendar:
  - title: "[Job Title] Interview with [Applicant Name]"
  - description: "Interview for [Job Title] position. Applicant: [Applicant Name] | Email: [Applicant Email] | Interviewers: [HR Name, Technical Reviewer Name] | ATS Link: [URL]"
  - start time: ISO 8601 format (e.g., "2025-09-15T10:00:00+09:00")
  - end time: ISO 8601 format (e.g., "2025-09-15T11:00:00+09:00")
  - location: "Virtual via Zoom" or "Office B3-05, Seoul"
  - attendees: email addresses of both applicant and interviewers (HR and technical reviewer)
  - visibility: "private" for all calendar events
- IF the Google Calendar API returns an error during event creation, modification, or deletion, THEN THE system SHALL log the error with the original request ID and send a system notification to the HR recruiter with instructions to manually update the calendar.

### Integration Account Requirements
- THE system SHALL use a dedicated service account (OAuth 2.0 client credentials) with the following Google OAuth scopes:
  - https://www.googleapis.com/auth/calendar
  - https://www.googleapis.com/auth/calendar.events
  - https://www.googleapis.com/auth/calendar.events.readonly
- THE system SHALL store the OAuth refresh token securely in the system's encrypted secret vault and use it to automatically renew expired access tokens.
- THE system SHALL ensure the service account has been granted domain-wide delegation (if used in a corporate G Suite environment) or has been explicitly shared calendar access by individual HR recruiters/candidates.
- WHERE a candidate's email is not recognized as a valid Google account, THE system SHALL create the calendar event only for the recruiter and interviewers, and send the candidate a calendar invite via email as a fallback.

## Email Messaging Integration

### Business Purpose
To deliver automated, timely, and personalized communications to applicants and staff—reducing human error, increasing candidate engagement, and ensuring compliance with communication protocols during hiring.

### Data Exchange Requirements
- WHEN a candidate's status changes (e.g., from "Document Submitted" to "Coding Test Scheduled"), THE system SHALL trigger an email notification to the candidate using the template defined for that status transition.
- WHEN an interview is scheduled, modified, or cancelled, THE system SHALL send a notification email to both the applicant and all assigned interviewers.
- WHEN a candidate passes or fails the coding test, THE system SHALL send a formal email with feedback (if provided by technical reviewer) and next steps.
- WHEN a candidate is accepted or rejected, THE system SHALL send a final email response within 1 hour of status update.
- THE system SHALL use an email service provider (ESP) that supports:
  - Transactional email APIs with high deliverability (98%+)
  - Template management with variables (e.g., {{applicant_name}}, {{job_title}}, {{interview_link}})
  - Bounce and complaint tracking
  - DKIM/SPF/DMARC authentication
  - Rate limiting of 100 messages per minute
- IF an email fails to send due to invalid address, server error, or spam filter rejection, THEN THE system SHALL log the failure, attempt retry (up to 3 times over 24 hours), and escalate to the HR recruiter via in-app notification if all retries fail.
- THE system SHALL store all sent email content, headers, timestamps, and delivery statuses for audit purposes.
- WHERE an applicant has not verified their email address, THE system SHALL NOT send any communication until verification is complete.

## External Resume Parsing Service

### Business Purpose
To automatically extract structured data from unstructured resumes submitted in PDF or Word format, reducing manual data entry and improving accuracy and consistency in candidate profiles.

### Data Exchange Requirements
- WHEN a candidate uploads a resume file (.pdf, .doc, .docx), THE system SHALL send the file to the external resume parsing service with a request for structured extraction.
- THE system SHALL submit the following data to the parser:
  - file: the raw binary content of the uploaded document
  - file_type: extension of the file (pdf, doc, docx)
  - language: auto-detected or explicitly specified from the document
  - employer_id: the internal organization ID associated with the job posting
- THE system SHALL expect the following structured JSON response from the parser:
  - full_name: string (required)
  - email: email address (required)
  - phone: string in international format (e.g., "+821012345678") (required)
  - current_location: string (e.g., "Seoul, South Korea")
  - education: array of objects with fields: institution, degree, field, start_date, end_date
  - work_experience: array of objects with fields: company, title, start_date, end_date, description
  - skills: array of strings (e.g., ["Python", "Node.js", "AWS"])
  - certifications: array of strings (e.g., ["AWS Certified Solutions Architect"])
- IF the parsing service returns an error (e.g., corrupted file, unsupported format, service unreachable), THEN THE system SHALL:
  - retain the original file for manual review
  - set candidate status to "Resume Pending Manual Review"
  - notify the HR recruiter by in-app alert
- IF the parser returns incomplete data, such as missing email or name, THEN THE system SHALL:
  - retain the extracted information
  - flag the candidate profile as "Partial Data Extracted"
  - prompt the HR recruiter to manually confirm and complete missing fields
- THE system SHALL rate-limit requests to the parsing service to no more than 6 requests per minute to avoid rate throttling.
- WHERE multiple documents are uploaded by a single candidate, THE system SHALL process only the most recently uploaded file.

## Authentication Provider (OAuth 2.0)

### Business Purpose
To enable secure, standardized, and user-friendly authentication for all user roles while reducing password management overhead and supporting enterprise identity federation.

### Data Exchange Requirements
- THE system SHALL support login via SSO (Single Sign-On) using OAuth 2.0 with the following providers:
  - Google (google.com)
  - Microsoft Entra ID (Azure AD)
- WHEN a user selects "Sign In with Google" or "Sign In with Microsoft", THE system SHALL redirect the browser to the respective provider's authorization endpoint with:
  - client_id: registered in the provider's console
  - redirect_uri: https://atsSystem.example.com/auth/callback
  - scope: openid profile email
  - response_type: code
- AFTER authentication, THE provider SHALL redirect to the system with an authorization code.
- THE system SHALL exchange the authorization code for an ID token and access token using a backend server-to-server POST request.
- THE system SHALL validate the ID token signature, issuer, audience, and expiration.
- THE system SHALL extract the following claims from the ID token:
  - sub (user identifier)
  - email
  - name
  - picture (optional)
  - hd (for G Suite domains)
- IF the user's domain is not on the approved list (e.g., "example.com"), THEN THE system SHALL deny access and display: "Access denied. Please use an approved organization email."
- WHERE a user logs in successfully for the first time, THE system SHALL automatically create a new account with role "applicant" by default, unless the email matches a known HR recruiter or system admin in the user directory.
- THE system SHALL require re-authentication via OAuth every 30 days for all users.
- IF the OAuth identity provider returns an error (e.g., token expired, invalid redirect), THEN THE system SHALL redirect user to login screen with error message: "Authentication failed. Please try again."

## Notification Gateway Provider

### Business Purpose
To deliver time-critical SMS alerts to candidates and recruiters, ensuring no important updates (e.g., interview reminders or scheduling changes) are missed due to email overload or delayed access.

### Data Exchange Requirements
- WHEN a candidate's interview is scheduled within 24 hours, THE system SHALL send an SMS reminder to the candidate’s phone number obtained from the resume.
- WHEN an interview is rescheduled or cancelled, THE system SHALL send an SMS notification to both the applicant and all assigned interviewers, unless the update occurs less than 60 minutes before the scheduled time—in which case, only an email is sent.
- WHEN a candidate receives final status (accepted/rejected), THE system SHALL send an SMS notification if the candidate has explicitly opted in via profile settings.
- THE system SHALL use a SMS gateway provider with:
  - API access to send bulk and transactional messages
  - Support for international dialing codes (including +82 for South Korea)
  - Delivery receipts and error reporting
  - Rate limit of 10 messages per second per API key
  - Compliance with local messaging regulations (Korea’s Telecommunications Business Act)
- THE system SHALL collect and store the candidate’s mobile number in format "+821012345678" (international format) during resume parsing.
- WHERE a phone number is missing or invalid, THE system SHALL skip SMS delivery and fall back to email notification.
- IF the SMS gateway returns an error (e.g., invalid recipient, credit exhausted), THEN THE system SHALL log the failure, attempt one retry after 5 minutes, and then escalate to an in-app alert for HR action if retry fails.
- THE system SHALL maintain a local log of all sent SMS messages, including timestamp, recipient, content, delivery status, and provider response code.
- WHERE a user has declared "Do not contact via SMS" in their profile settings, THE system SHALL suppress all SMS notifications for that user, even if other triggers activate.