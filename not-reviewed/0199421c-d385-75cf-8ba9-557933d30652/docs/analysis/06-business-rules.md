## Resume Validation Rules

WHEN an applicant uploads a resume file, THE system SHALL accept only PDF (.pdf) and Microsoft Word (.doc, .docx) file formats. 

IF the file extension is not one of [.pdf, .doc, .docx], THEN THE system SHALL reject the upload with error message: "Unsupported file format. Please upload a PDF or Word document."

WHEN a resume file is uploaded, THE system SHALL validate that the file size is less than or equal to 10 MB. 

IF the file size exceeds 10 MB, THEN THE system SHALL reject the upload with error message: "File too large. Maximum allowed size is 10 MB."

WHEN a resume is uploaded, THE system SHALL extract at least one of the following fields: full name, phone number, or email address. 

IF no contact information can be extracted from the resume, THEN THE system SHALL mark the resume as "Parse Failed" and notify the applicant via email: "We could not extract your contact information from your resume. Please ensure your name, phone number, and email are clearly visible and try uploading again."


## Technical Skill Matching Logic

WHEN the system parses a resume, THE system SHALL identify and extract technical skills from a predefined list of 200+ industry-standard technologies (e.g., Node.js, Python, AWS, Docker, Kubernetes, React, PostgreSQL, Terraform).

THE system SHALL normalize skill names to standard forms (e.g., "NodeJS" → "Node.js", "React.js" → "React", "Docker CE" → "Docker").

WHEN a job posting is created with required skills, THE system SHALL match the candidate's extracted skills to the posting's required skills using fuzzy string matching with a 90% similarity threshold.

WHERE a candidate's extracted skill set matches at least 70% of a job posting's core required skills, THE system SHALL mark the candidate as "Strong Match" for that posting.

WHERE a candidate's extracted skill set matches between 40% and 69% of a job posting's core required skills, THE system SHALL mark the candidate as "Partial Match" for that posting.

WHERE a candidate's extracted skill set matches less than 40% of a job posting's core required skills, THE system SHALL mark the candidate as "Weak Match" for that posting.

WHILE reviewing applications, THE HR recruiter SHALL be able to filter candidates by skill match level: "Strong Match", "Partial Match", or "Weak Match".


## Interview Scheduling Constraints

WHEN the HR recruiter attempts to schedule an interview for a candidate, THE system SHALL verify that the candidate's status is "Technical Assessment Passed" or higher.

IF the candidate’s status is below "Technical Assessment Passed", THEN THE system SHALL block scheduling and display: "Interviews can only be scheduled for candidates who have passed the coding test."

WHEN two or more interviewers are assigned to the same interview, THE system SHALL auto-schedule the interview at a time when all selected interviewers and the candidate are available.

WHEN a candidate's availability is not provided, THE system SHALL not allow automatic scheduling and require the HR recruiter to manually propose times.

WHERE the candidate has conflict with any interviewer's existing calendar event, THE system SHALL exclude that time slot from available options.

WHEN an interview is scheduled, THE system SHALL automatically create an entry in Google Calendar for all participants with title: "[Job Title] Interview - [Candidate Name]", start/end times, and a description that includes the candidate's ID and job posting ID.


## Candidate Status Transition Rules

WHEN an applicant submits a resume, THE system SHALL set the candidate’s status to "Resume Submitted".

WHEN a resume is successfully parsed and at least one contact field is extracted, THE system SHALL transition the candidate’s status from "Resume Submitted" to "Resume Verified".

WHEN the candidate is invited to and accepts a coding test invitation, THE system SHALL set the candidate’s status to "Coding Test Assigned".

WHEN the candidate submits their coding test, THE system SHALL transition the status to "Coding Test Submitted".

WHEN the technical reviewer assigns a score to the coding test and completes their evaluation, THE system SHALL set the candidate’s status to "Technical Assessment Passed" if score ≥ 70, or "Technical Assessment Failed" if score < 70.

WHEN an interview is scheduled and confirmed by both the HR recruiter and candidate, THE system SHALL set the candidate’s status to "Interview Scheduled".

WHEN the interview is completed, THE system SHALL set the candidate’s status to "Interview Completed".

WHEN the HR recruiter recommends a candidate for hire, THE system SHALL set the candidate’s status to "Recommended for Hire".

WHEN the hiring manager formally approves the candidate, THE system SHALL set the status to "Offer Extended".

WHEN the candidate accepts an offer, THE system SHALL set the status to "Hired".

WHEN a candidate’s status transitions from "Technical Assessment Failed" or "Interview Completed", THE system SHALL not allow further status changes unless the HR recruiter manually resets the candidate to "Resume Verified" (reopens application).

WHILE a candidate’s status is "Hired", THE system SHALL prohibit any further job applications from that candidate.


## Notification Trigger Rules

WHEN the system detects the candidate’s status changes to "Resume Verified", THE system SHALL send an automated email to the candidate: "Thank you for submitting your resume. Your documents have been successfully received and processed."

WHEN the system assigns a coding test, THE system SHALL send an email and SMS notification to the candidate with a link to take the test, valid for 7 days.

WHEN the candidate submits a coding test, THE system SHALL send an email notification to the assigned technical reviewer: "New coding test submitted: [Candidate Name], Job Posting [ID]. Please review within 48 hours."

WHEN the technical reviewer completes the evaluation, THE system SHALL notify the candidate via email, stating only: "Your coding test has been evaluated. You may proceed to the next step OR your application has been closed."

WHEN an interview is scheduled, THE system SHALL send a calendar invite to the candidate and interviewers, and an SMS/email reminder 24 hours before the interview.

WHEN an interview is canceled or rescheduled, THE system SHALL send an updated calendar invite and SMS/email notification to all participants.

WHEN a candidate receives an offer, THE system SHALL send an email with the offer details and a link to accept or decline within 72 hours.

WHEN an offer is accepted, THE system SHALL notify the HR recruiter via email: "Candidate [Name] has accepted the offer for [Job Title]. Welcome to the team!"

WHEN a candidate's status changes to "Technical Assessment Failed", THE system SHALL send an email: "Thank you for participating in our selection process. Unfortunately, you did not meet the required technical standards for this position. We wish you success in your job search."


## Export Data Format Rules

WHEN the HR recruiter initiates a data export, THE system SHALL generate a CSV or Excel (.xlsx) file containing exactly these columns.

| Column Name | Data Type | Source | Example Value |
|-------------|-----------|--------|---------------|
| Candidate ID | string | System-generated | CAND-2025-0913-001 |
| Full Name | string | Extracted from resume | Jane Doe |
| Email | string | Extracted from resume | jane.doe@email.com |
| Phone | string | Extracted from resume | +82-10-1234-5678 |
| Education | string | Extracted from resume | B.S. Computer Science, Seoul National University |
| Work Experience | string | Extracted from resume | Senior Developer, Meta Seoul - 2020–2024 |
| Skills Extracted | string | AI-parsed from resume | Python, Node.js, AWS, PostgreSQL |
| Job Applied For | string | From job posting | Senior Backend Engineer |
| Match Level | string | Skill matching logic | Strong Match |
| Resume Status | string | Status transition rules | Hired |
| Interview Scheduled | boolean | Scheduling system | true |
| Coding Test Score | number | Technical reviewer input | 85 |
| Interview Feedback | string | Reviewer comments | "Excellent problem-solving, strong system design" |
| Date Applied | datetime | System timestamp | 2025-09-10T14:22:11Z |
| Date Hired | datetime | System timestamp | 2025-09-12T16:30:00Z |

THE system SHALL ensure that all fields are properly escaped to handle commas, newlines, and special characters in the export.

THE system SHALL support exporting either all candidates or filtered subsets (e.g., by job posting, status, or match level).


## AI Interview Question Generation Rules

WHEN the HR recruiter selects a candidate for interview and clicks "Generate Interview Questions", THE system SHALL trigger an AI-based question generator.

THE system SHALL analyze the candidate’s resume and coding test response to identify key skills and projects referenced.

WHERE a candidate’s resume mentions a technology (e.g., Docker, Kubernetes, AWS Lambda), THE system SHALL generate at least one behavioral and one technical question related to that technology.

EXAMPLE: If a candidate states "Built serverless API using AWS Lambda and API Gateway", THE system SHALL generate:
- Behavioral: "Tell me about a time you designed a serverless solution. What challenges did you face?"
- Technical: "How would you optimize a slow AWS Lambda function with high cold start times?"

WHERE a candidate’s coding test used a specific algorithm (e.g., dynamic programming, binary search), THE system SHALL generate one question asking the candidate to explain their approach and performance complexity.

THE system SHALL prevent generation of questions unrelated to the candidate’s actual skills or experience.

THE system SHALL generate exactly 5–8 questions per candidate, split between:
- 3–4 technical questions (focused on skills listed in resume and test)
- 2–3 behavioral questions (focused on experience, teamwork, failure, or problem-solving)
- 1 question about candidate’s motivation to join the role/company

IF the AI system cannot find sufficient context in the resume or test results, THE system SHALL default to generating questions based only on the target job posting’s required skills.

NONE of the generated questions SHALL refer to the candidate's personal details such as name, age, nationality, or marital status.

THE system SHALL display the generated questions with a "Edit" option so the HR recruiter can modify or remove questions before sending.

WHEN the HR recruiter sends the questions to the candidate, THE system SHALL log the selection and timestamp of final question set as audit trail.