# CREVERSE AI Essay Auto-Grading Backend API - Business Requirements Analysis

## 1. Introduction and Business Model

The CREVERSE AI Essay Auto-Grading platform is designed to solve the critical problem of scalable, consistent, and objective essay grading for educational organizations and enterprises. It addresses the challenges of manual essay evaluation—such as subjectivity, delay, and labor cost—by providing an AI-powered, multi-tenant platform with customizable rubrics, automated workflows, and detailed analytics.

### Why This Service Exists
Educational institutions require a solution to reliably assess large volumes of student essays with fairness and speed. CREVERSE fills this market gap by applying advanced AI models and rigorous business controls to automate and scale essay grading.

### Revenue Model
The platform generates revenue through tiered subscriptions to tenants (schools, districts), usage-based quotas for grading and plagiarism scans, and premium analytics features.

### Growth Strategy
User acquisition is planned via partnerships with educational institutions and integration with LMS providers. Retention will be driven by continuous improvement of scoring accuracy, usability enhancements, and robust analytics.

### Key Success Metrics
- Number of active tenants and users
- Essays graded per period
- Average grading turnaround time
- Accuracy and consistency of AI scoring
- Customer satisfaction and renewal rates

## 2. User Roles and Authentication

CREVERSE defines multiple user roles with explicitly scoped permissions enforced via RBAC and JWT authentication:

- Guest: Limited access to login and public endpoints only.
- Student: Submit essays, view personal grading results and reports.
- Teacher: Create and manage rubrics, assign essays, review plagiarism outcomes, access class-level analytics.
- Analyst: Read-only analytics, auditing access for operational oversight.
- Admin: Full system-wide management including tenant administration, API keys, feature flags, and audit.

### Authentication Requirements
- The system SHALL provide OIDC and JWT-based authentication with scoped tenant and role claims.
- Password resets, email verification, and session management must be handled securely.
- API keys MAY be issued to tenants with permissions and quotas.
- Rate limiting SHALL be enforced at user and API key levels.

## 3. Functional Requirements

### 3.1 Essay Submission
- Students SHALL submit essays via text input, file upload (with SAS URLs), or OCR.
- Every submission creates an Essay record with tenant, student, class, language, and status metadata.
- Essays maintain multiple versions, supporting normalization, OCR, and correction.

### 3.2 Rubric Building and Publishing
- Teachers SHALL create rubric templates with criteria, scale, and weights.
- Rubrics move through Draft → Published → Deprecated states; published versions are immutable.
- Rubric validation MUST ensure weights sum to 1.0 within tolerance, scale boundaries are valid, criteria have required anchors, and guardrails such as banned phrases are enforced.

### 3.3 Grading
- Grading requests SHALL bind an EssayVersion with a RubricVersion.
- Jobs are queued and processed asynchronously with retries and circuit breaking for calls to AI models.
- Scores include overall normalized results, per-criterion feedback, calibration info, and optional plagiarism data.

### 3.4 OCR Processing
- Users or system SHALL request OCR on essay blobs.
- OCR converts PDFs/images to text and stores them as new EssayVersions.

### 3.5 Plagiarism Scanning
- Plagiarism scans SHALL be provider-agnostic with results stored per essay version.
- Scans run asynchronously with status updates and retries on failures.

### 3.6 Reporting
- Reports include student progress, class grade distributions, rubric analysis, anomaly detection, and cost governance.
- Filtering and pagination SHALL be supported.

### 3.7 Administration
- Admins SHALL manage tenants, API keys, feature flags, webhooks, audit logs, and system health.

## 4. Business Rules and Validations

- Rubric weights SHALL sum to 1.0 ±0.001.
- Scales SHALL be integer-based, with valid min < max.
- Criteria SHALL have required anchors covering min, max, and a mid-point.
- Guardrails shall enforce banned phrases, minimum essay token count, and allowed languages.
- Tenant isolation MUST be enforced on all data access via scoped JWT and Postgres RLS.

## 5. Security and Compliance

- Tenant isolation SHALL be ensured through JWT claims and RLS policies.
- PII must be encrypted at rest and redacted in logs.
- Operations that access PII SHALL be audited.
- Rate limits and quotas shall prevent abuse.
- GDPR-like data subject access and deletion processes shall be supported.

## 6. Data Flow and Entity Lifecycle

- Essays flow from submission to versioning, normalization, and grading.
- Grading jobs proceed through queued, processing, succeeded, failed, or cancelled states.
- Plagiarism scans parallel grading or run chained.
- Audit logs capture all read/write actions.

## 7. Asynchronous Event Processing

- Queues manage OCR ingestion, grading scoring, plagiarism scanning, analytics rollups, and webhook delivery.
- Retry uses exponential backoff from 0.5s to 30s with max 5 attempts.
- Dead-letter queues catch poison pills and failed jobs.

## 8. Observability

- OpenTelemetry traces span from HTTP ingress to queues and model calls.
- Sentry monitors errors with alerts via Slack and PagerDuty.
- Dashboards display queue depths, success rates, latencies, token usage, and webhook health.

## 9. Error Handling

- Standardized error codes (e.g., RUBRIC_INVALID, ESSAY_NOT_FOUND) returned with detailed messages.
- Clients receive HTTP 429 for rate limiting with Retry-After headers.
- Poison pill detection prevents retry loops.

## 10. Deployment and Release

- Kubernetes-based deployment with HPA and Canary/Blue-Green rollouts.
- Configuration via environment variables and App Config.
- Forward-only DB migrations.
- Immediate rollback and emergency feature flag toggling supported.

## 11. Testing and Quality Assurance

- Comprehensive unit, integration, contract, load, and chaos testing.
- Golden datasets to detect regression.
- CI/CD integration with automated tests and smoke tests.

## 12. Cost Governance

- Per-job tracking of token consumption, latency, and cost.
- Reporting on usage and costs by tenant, class, and model.
- Auto-throttling when budgets are exceeded with admin notifications.

## 13. Appendices

- Detailed sequence diagrams of core workflows.
- Calibration formula descriptions.
- RLS policies and key management guidance.

---

This document provides business requirements only. All technical implementation decisions belong to the development team. The content specifies WHAT the system shall do, not HOW to build it.