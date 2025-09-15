# CREVERSE AI Essay Auto-Grading Backend API Business Requirements Specification

## 1. Introduction

The CREVERSE AI Essay Auto-Grading system is designed to provide educational institutions and enterprises with a scalable, precise, and automated essay evaluation platform leveraging advanced AI models combined with customizable scoring rubrics. This document captures the complete business requirements enabling backend development teams to build a robust, secure, and compliant service.

### 1.1 Purpose

This specification defines the WHAT of the system—comprehensive business rules, user workflows, and operational constraints—omitting technical implementation details. It serves backend developers by eliminating ambiguity and enabling precise, testable requirements.

### 1.2 Scope

The system manages multi-tenant essay submissions, rubric creation/versioning, asynchronous AI scoring, plagiarism detection, analytics, auditing, cost governance, and administration.

### 1.3 Business Context

Educational institutions face growing pressures to efficiently grade essays at scale while maintaining consistency and compliance. CREVERSE AI automates grading with user-definable rubrics and integrates plagiarism detection to uphold academic integrity. It supports detailed operational monitoring and cost controls to align with enterprise governance.

## 2. Business Model

### 2.1 Why the Service Exists

Manual essay grading is labor-intensive, inconsistent, and delays feedback to learners. CREVERSE meets the market need by providing rapid, scalable, and unbiased AI-driven grading supported by customizable rubrics and institutional controls.

### 2.2 Revenue Model

The platform monetizes through subscription tiers tied to tenant size and usage volume. Additional revenue streams include advanced analytics, plagiarism scan options, and premium rubric features.

### 2.3 Growth Strategy

Growth focuses on educational partnerships, integration with learning management systems, and continuous improvement of AI models and usability.

### 2.4 Success Metrics

- Number of active tenants and users
- Essays graded monthly
- Average grading turnaround time
- Customer satisfaction and retention rates

## 3. User Roles and Authentication

### 3.1 Defined User Roles

- **Guest:** Limited public access, primarily for login.
- **Student:** Essay submission, viewing personal grades and feedback.
- **Teacher:** Rubric management, grading oversight, plagiarism review, reporting.
- **Analyst:** Read-only access to analytics, audit, and cost data.
- **Admin:** Full control of tenants, API keys, audit, system health, feature flags.

### 3.2 Authentication Workflows

- WHEN users log in, THE system SHALL authenticate via OIDC or email/password and issue JWT tokens with role and tenant claims.
- THE system SHALL manage user sessions, enforce token expiration, and enable refresh.
- SYSTEM ADMINS SHALL create and manage API keys with scopes and usage quotas.

### 3.3 Permissions Matrix

| Action / Resource               | Guest | Student | Teacher | Analyst | Admin |
|--------------------------------|-------|---------|---------|---------|-------|
| Login / Logout                 | ✅    | ✅      | ✅      | ✅      | ✅    |
| Submit Essay                  | ❌    | ✅      | ❌      | ❌      | ❌    |
| View Own Grades               | ❌    | ✅      | ❌      | ❌      | ❌    |
| Create/Edit Rubric Templates  | ❌    | ❌      | ✅      | ❌      | ❌    |
| Publish/Deprecate Rubrics     | ❌    | ❌      | ✅      | ❌      | ❌    |
| Manage Grading Jobs           | ❌    | ❌      | ✅      | ❌      | ❌    |
| View Plagiarism Scans         | ❌    | ✅ (own)| ✅      | ❌      | ❌    |
| Access Reports (Class/School) | ❌    | ❌      | ✅      | ✅      | ❌    |
| Access Analytics & Costs      | ❌    | ❌      | ❌      | ✅      | ❌    |
| Manage Tenants & API Keys     | ❌    | ❌      | ❌      | ❌      | ✅    |
| Manage System Config & Admin  | ❌    | ❌      | ❌      | ❌      | ✅    |
| Perform Audit Log Reviews     | ❌    | ❌      | ❌      | ✅      | ✅    |

## 4. Functional Requirements

### 4.1 Essay Submission and Versioning

- STUDENTS SHALL submit essays as text input, file upload, or OCR processed content.
- THE system SHALL record each submission per tenant, class, and student with versioned text stored.
- ESSAYS SHALL track statuses from 'received' to 'graded' or 'error'.
- SYSTEM SHALL generate presigned URLs for secure file uploads.
- Multiple EssayVersions SHALL represent original and normalized forms.

### 4.2 Rubric Management

- TEACHERS SHALL create rubric templates with language, scope, and versioning.
- Rubric versions SHALL progress through draft, published, deprecated states.
- WEIGHTS for criteria SHALL sum to approximately 1.0.
- CRITERIA anchors SHALL cover scoring boundaries (min, max, mid).
- GUARDRAILS may enforce banned phrases, minimum token lengths, and allowed languages.
- PUBLISHED rubrics ARE immutable.

### 4.3 Grading Workflow

- GRADING jobs SHALL bind EssayVersions and RubricVersions.
- GRADING is asynchronous, with status lifecycle from queued to processing to success/failure.
- PREPROCESSING includes language detection and normalization.
- AI SCORING call SHALL include rubric anchors, weights, tone, guardrails.
- RESULTS include per-criterion scores, overall normalized scores, feedback, calibration info.
- OPTIONAL plagiarism scan integration is available.

### 4.4 OCR Processing

- OCR jobs SHALL process essay blobs to extract text.
- OCR results SHALL form new EssayVersions for grading.

### 4.5 Plagiarism Detection

- PLAGIARISM scans SHALL support multiple providers asynchronously.
- MATCHES with source spans and scores SHALL be recorded.

### 4.6 Reporting and Analytics

- REPORTS cover student progress trends, class score distributions, anomalies, and cost governance.

### 4.7 Error Handling

- VALIDATIONS SHALL provide clear error codes such as RUBRIC_INVALID, ESSAY_NOT_FOUND, etc.
- FAILED jobs SHALL support retry with exponential backoff and dead-letter handling.

## 5. Security, Compliance, and Data Isolation

- MULTI-TENANCY enforced via tenant_id in data rows and Postgres RLS.
- STRICT RBAC applied at route and attribute levels.
- PII encrypted at rest, redacted in logs.
- AUDIT trails capture all access and modification actions.
- RATE LIMITS and quotas enforced per user and API key.
- COMPLIANCE includes GDPR-like data access and deletion workflows.

## 6. Performance and Scalability

- HORIZONTALLY scalable workers and services.
- CONCURRENCY configured per queue (grading=8, OCR=4).
- CACHING of rubric versions and common queries.
- READ REPLICAS for analytics.
- BATCH chunking for large grading jobs.

## 7. Observability

- DISTRIBUTED tracing from HTTP to queues and external calls.
- ERROR reporting with Sentry and alerting.
- OPERATIONAL dashboards with queue metrics, token cost, webhook health.

## 8. Cost Governance

- TRACK per-job tokens, latency, cost.
- REPORT costs per tenant, class, model.
- AUTO-THROTTLE on budget overruns.

## 9. Administrative and Operational Functions

- FEATURE flags management.
- AUDIT log access and filtering.
- SYSTEM health endpoints.
- WEBHOOK configuration with retries and DLQs.

## 10. Deployment and Release

- CANARY and blue-green deployments.
- DB migrations are forward-only.
- FEATURE flag-based emergency switches.
- ROLLBACK mechanisms for production stability.

## 11. Testing and Quality Assurance

- UNIT, INTEGRATION, CONTRACT testing.
- LOAD and CHAOS testing.
- GOLDEN datasets for regression detection.

## 12. Error Handling

- ERROR codes and structured responses.
- RETRY and exponential backoff strategies.
- POISON pill detection.

## 13. Event Processing and Async Workflows

- QUEUED job processing for grading, OCR, plagiarism.
- WEBHOOK delivery with signed payloads and retries.

## 14. Appendices

- MERMAID diagrams illustrating workflows and states.
- GLOSSARIES and references.

---

This document provides business requirements only. Technical implementations, including architecture, APIs, database design, and infrastructure, are under developer autonomy. The document defines WHAT the system must do, not HOW to build it.
