## Error and Exception Handling

### Upload Failure: Invalid File Type

WHEN an applicant uploads a file with an extension that is not .pdf, .doc, or .docx, THE system SHALL reject the upload immediately and display the error message: "Invalid file type. Please upload a PDF, Word (.doc), or Word XML (.docx) document only."

WHEN the system rejects an invalid file type, THE system SHALL preserve the applicant's form state, including any previously entered personal information, to minimize re-entry effort.

IF the applicant attempts to upload a compressed archive (.zip, .rar, .7z) or image file (.jpg, .png, .gif), THEN THE system SHALL treat it as invalid file type and return the same error message.

### Upload Failure: Corrupted or Unreadable Document

WHEN an applicant uploads a file with a valid extension (.pdf, .doc, .docx) but the content is corrupted, encrypted, password-protected, or unreadable by the document parsing engine, THE system SHALL reject the file and display the error message: "The file appears to be corrupted or unreadable. Please re-save your document as a standard PDF or Word file and try again."

WHERE the applicant's uploaded document is flagged as potentially encrypted or password-protected, THE system SHALL log the event in the system audit trail with severity "WARNING" for administrative review, but SHALL NOT disclose technical details to the applicant.

WHILE the system is processing any uploaded document, THE system SHALL enforce a 20 MB maximum file size limit and reject files exceeding this threshold with the message: "File size exceeds 20 MB limit. Please reduce file size and re-upload."

### Parse Failure: Missing Required Info

WHEN the system's resume parsing engine successfully reads the file but fails to extract one or more of the following required fields — name, email address, or phone number — THE system SHALL mark the resume as "Incomplete" and notify the applicant: "We could not detect your full name, email address, or phone number in your resume. Please ensure these details are clearly visible in your document and re-upload."

IF the applicant's resume contains multiple email addresses or phone numbers, THEN THE system SHALL prioritize the first occurrence that matches standard format patterns, and SHALL log the ambiguity in the applicant's profile for HR recruiter review.

WHERE the parsing engine detects a possible name but no email or phone, THE system SHALL allow submission but flag the record as "Low Confidence" in the HR recruiter interface.

### Calendar Sync Failure

WHEN the HR recruiter attempts to schedule an interview and the Google Calendar integration fails to create or update the event, THE system SHALL remain in the "Scheduled" state for the interview and display the message: "Your interview was scheduled in our system, but Google Calendar could not be updated. Please check your calendar manually and notify the applicant via email."

WHEN a calendar sync failure occurs, THE system SHALL retry automatically up to three (3) times at 5-minute intervals, and if all retries fail, SHALL log the failure with the Google Calendar error code and timestamp.

IF the Google Calendar API returns an authentication error (401) or rate limit exceeded (429), THEN THE system SHALL inform the system admin via in-app notification: "Google Calendar authentication has expired or is rate-limited. Please re-authenticate or check API quotas in Admin > Integrations."

### Email Delivery Failure

WHEN the system attempts to send an automated notification (e.g., interview confirmation, rejection) and the email fails to deliver due to a failed SMTP connection, invalid recipient address, or recipient domain rejection, THE system SHALL mark the notification status as "Failed (Delivery)" in the audit log and update the applicant's timeline with: "A notification could not be sent. Please contact the applicant directly."

WHERE an email fails delivery, THE system SHALL attempt to send a single fallback SMS (if the applicant's phone number is verified) with a concise message: "Your interview with [Company] is scheduled for [Date] at [Time]. Visit [link] to confirm."

WHILE email notifications are being processed, THE system SHALL ensure no duplicate emails are sent within a 24-hour window for the same event type and candidate.

### Coding Test Submission Failure

WHEN an applicant attempts to submit a coding test solution but the upload is incomplete, malformed, or exceeds the 1 MB file size limit, THE system SHALL reject the submission and display: "Your code submission failed. Ensure your file is under 1 MB and is a single .zip, .py, .js, .java, or .cs file."

IF the submitted code file does not contain a main function or entry point (e.g., no main(), public static void main, or equivalent) as defined by the language-specific test criteria, THEN THE system SHALL run a static analysis and return: "Your submission cannot be executed. Please ensure your code includes a valid main entry point and follows the provided template."

WHEN a coding test submission is received timeout after 60 seconds during processing, THE system SHALL mark it as "Processing Failed" and notify the technical reviewer: "Automated evaluation timed out for candidate [ID]. Please manually review submission."

### Authentication Failure

WHEN any user attempts to log in with invalid credentials (incorrect password, locked account, or nonexistent email), THE system SHALL return HTTP 401 Unauthorized with the message: "Invalid email or password. Please try again or recover your account."

WHEN a user attempts to log in from a new device or IP address not previously associated with their account, THE system SHALL require email verification of the login attempt before completing authentication.

IF the system detects five (5) consecutive failed login attempts from the same IP address within 15 minutes, THEN THE system SHALL temporarily lock the IP address for 30 minutes and notify the system admin: "Potential brute-force attack detected from IP [X.X.X.X]."

### Permission Denied Access

WHEN a user attempts to access an endpoint or function that exceeds their role permissions, THE system SHALL return HTTP 403 Forbidden with the message: "You do not have permission to perform this action. Please contact your administrator if you believe this is an error."

WHERE an HR recruiter attempts to view applicant data assigned to a different department, THEN THE system SHALL block access and return the same 403 message, ensuring data isolation between HR units.

WHEN a technical reviewer attempts to access the scheduling interface or job posting creation page, THEN THE system SHALL redirect them to their dashboard and display a banner: "Access denied. Technical reviewers can only view and evaluate coding tests on this page."

WHEN a system admin attempts to delete a user who is the last remaining admin account, THEN THE system SHALL prevent the deletion and return: "Cannot delete last admin account. At least one admin account must exist."

WHEN an applicant attempts to access another applicant's profile via direct URL manipulation, THEN THE system SHALL return a generic 403 message and log the event as "Potential Security Intrusion Attempt" in the audit trail.