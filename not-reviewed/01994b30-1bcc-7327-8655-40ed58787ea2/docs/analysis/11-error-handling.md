# CREVERSE AI Essay Auto-Grading Backend API Specification (Business-Ready, v2 EN)

## 1. Introduction

The CREVERSE AI Essay Auto-Grading platform is designed as an enterprise-grade, multi-tenant system that automates essay evaluation at scale. This document specifies clear business requirements focusing strictly on the system behavior, user roles, processes, and rules needed to build and operate the backend successfully. The specification fully supports scalable multi-tenancy, customizable rubrics, asynchronous grading pipelines, plagiarism detection, compliance auditing, cost governance, and rich analytics.

## 2. Business Model

### 2.1 Business Justification
The manual grading of student essays is labor-intensive, inconsistent, and costly, limiting the ability of educational institutions to scale formative assessment reliably. CREVERSE AI meets this critical market need by automating essay scoring with customizable rubrics and LLM scoring models, enabling institutions to increase grading throughput while maintaining objectivity and compliance.

### 2.2 Revenue and Growth Strategy
Revenue is generated via tiered subscriptions based on tenant size and features usage. Premium pricing tiers enable advanced plagiarism scanning, analytics, and higher usage quotas. Growth will be driven by partnerships with schools, districts, and online platforms.

### 2.3 Success Metrics
Key performance will be measured by monthly active tenants, essays graded, average grading turnaround time, user satisfaction, and operational cost efficiency.

## 3. User Roles and Authentication

### 3.1 Role Definitions
- **Guest**: Unauthenticated users with limited system access.
- **Student**: Can submit essays, view personal grading results and reports.
- **Teacher**: Manages rubrics, assigns grading, reviews plagiarism scans, and accesses reports.
- **Analyst**: Read-only access to operational analytics and audit logs.
- **Admin**: Full system control including tenant and API key management, feature flags, audit oversight, and operational configurations.

### 3.2 Authentication Flow
The system shall authenticate users via OIDC or email/password and issue scoped JWTs containing tenant and role claims. Sessions will be securely maintained with expiration and refresh mechanisms.

### 3.3 Permissions and Rate Limiting
Role-based access control will enforce route permissions and data scopes. Rate limits and quotas are applied per user and API key, returning proper HTTP errors on limits exceeded.

## 4. Functional Requirements

### 4.1 Multi-Tenancy
- Data shall be strictly isolated by tenant using tenant_id and PostgreSQL Row-Level Security.
- API keys shall be scoped per tenant with configurable permissions and usage quotas.

### 4.2 Rubric Management
- Rubric templates and versioning workflows shall be supported.
- Draft rubrics are editable; published versions immutable.
- Validation rules include weights summing to 1.0, coverage of anchors, scale constraints, and optional guardrails.

### 4.3 Essay Submission and Versioning
- Essays shall be submitted by text, upload, or OCR with artifact storage.
- Versioning supports multiple revisions, normalization, and text extraction.

### 4.4 Grading
- Asynchronous scored grading jobs link essay versions to rubric versions.
- Prompt building includes rubric anchors, tone, guardrails.
- Retry logic uses exponential back off with DLQ.
- Normalization of raw scores to calibrated scales applied.

### 4.5 Plagiarism Detection
- Provider agnostic scanning with match storage.
- Scan lifecycle states tracked asynchronously.

### 4.6 OCR Pipeline
- File ingests trigger OCR jobs producing text versions.

### 4.7 Reporting and Analytics
- Reports cover student progress, class distributions, rubric break down, anomaly detection, and cost governance.

### 4.8 Admin and Ops
- Feature flag management, system health checks, audit log resource APIs, webhook configuration and management.

## 5. Business Rules and Validation

- Rubric weights SHALL sum within tolerance (0.999 to 1.001).
- Rubric version states enforce immutability post publish.
- Calibration adjustment for grading applies length penalty and CEFR-level scaling.
- Audit logs SHALL capture PII access.

## 6. Security and Compliance

- RBAC enforcement, tenant isolation, encryption of PII, audit trails, GDPR-like data subject processing.
- Rate limiting and quotas STRICTLY enforced.

## 7. Performance and Scalability

- Horizontal scaling of workers with concurrency limits.
- Batch chunking for grading jobs.
- Caching and HTTP conditional requests.

## 8. Observability

- OpenTelemetry distributed tracing.
- Sentry for error logging.
- Operational dashboards with queue depths, token costs, webhook success rates.

## 9. Error Handling

- Standard error codes such as RUBRIC_INVALID, GRADING_RATE_LIMITED, TENANT_FORBIDDEN.
- Consistent client error messaging with retry headers.
- Retry with exponential backoff, DLQs, and poison pill detection.

## 10. Administrative Functions

- Feature flags, audit log querying, system health endpoints, webhook management.

## 11. Deployment

- AKS Kubernetes deployment with HPA.
- Canary and blue-green rollout strategies.
- Forward-only DB migrations.

## 12. Testing

- Unit, integration, contract, load, chaos testing.
- Golden datasets and regression controls.

## 13. Cost Governance

- Tracking of token usage, latency, and cost per job.
- Budget enforcement and auto-throttling.

## 14. External Integrations

- AI scoring, storage, plagiarism providers, observability tools, webhook delivery.

## 15. Data Flows and Lifecycle

- Entity lifecycle management and versioning.
- Async pipelines integration.


---

This document provides business requirements only. All technical implementation decisions belong to development teams. It specifies WHAT the system must do, not HOW to implement it.