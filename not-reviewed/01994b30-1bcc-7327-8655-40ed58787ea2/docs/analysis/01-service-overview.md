# CREVERSE AI Essay Auto-Grading Backend API - Business Requirements Analysis

## 1. Introduction

The CREVERSE AI Essay Auto-Grading platform is an enterprise-grade, multi-tenant backend service designed to automate and scale essay evaluation for educational institutions and enterprises. It addresses the critical need for consistent, scalable grading with rich customization, compliance, and robust operational controls.

## 2. Business Model

### Why This Service Exists
Educational institutions face substantial challenges in manual essay evaluation, including high labor costs, inconsistent scoring, and delayed feedback. CREVERSE AI addresses these problems by delivering an AI-powered platform that automates essay grading at scale with customizable scoring rubrics and integrated plagiarism detection, enabling institutions to improve efficiency and feedback quality.

### Revenue Strategy
The platform will generate revenue through subscription licensing based on tenant size and feature tiers. Additional revenue streams include premium analytics, advanced plagiarism scanning, and AI scoring quota extensions.

### Growth Strategy
Growth will be driven by partnerships with educational organizations, integration with learning management systems, and ongoing improvements in scoring accuracy and analytics capabilities.

### Success Metrics
Key metrics include the number of active tenants, essay submissions processed monthly, grading turnaround times, user satisfaction scores, and operational cost efficiency.

## 3. User Roles and Authentication

### User Roles
- **Guest:** Access to login and public information only.
- **Student:** Can submit essays and view personal grades.
- **Teacher:** Manages rubrics, assigns essays for grading, reviews plagiarism reports, accesses class reports.
- **Analyst:** Read-only access to analytics, audits, and cost reports.
- **Admin:** Full system access including tenant management, API keys, audit logs, and configuration.

### Authentication Requirements
- The system SHALL authenticate users via OpenID Connect (OIDC) or email/password login.
- JWT tokens SHALL encode tenant and role claims for authorization.
- Rate limits and quotas SHALL be enforced per user and API key.
- API keys SHALL support scoped permissions and monthly quotas.

## 4. Multi-Tenancy and Security

- ALL data SHALL be scoped with tenant_id and enforced via Postgres Row-Level Security (RLS).
- API requests SHALL include scoped JWT claims to restrict access by tenant.
- Cross-tenant data access SHALL be prohibited with explicit error codes.
- PII access and modifications SHALL be logged in audit trails.

## 5. Rubric Management

- Rubric templates SHALL support multiple versions: draft, published, deprecated.
- Rubric drafts SHALL validate criterion weights sum to exactly 1.0 plus/minus a tolerance.
- Criteria SHALL have anchors defining scoring boundaries.
- Guardrails SHALL optionally enforce minimum tokens, banned phrases, and repetition limits.

## 6. Essay Submission and Versioning

- Essays MAY be submitted by text, file upload with SAS URLs, or OCR-processing.
- Multiple essay versions SHALL support normalized or OCR text.
- Essays SHALL be tagged with tenant, student, and class associations.

## 7. Grading and Scoring Process

- Grading jobs SHALL be asynchronous and bind essay and rubric versions.
- Scoring SHALL consider rubric anchors, weights, tone, and guardrails.
- Scores SHALL be normalized and calibrated.
- Feedback SHALL provide per-criterion comments.

## 8. Plagiarism Detection

- Plagiarism scans SHALL be provider-agnostic and asynchronous.
- Matches SHALL be recorded with sources and spans.

## 9. OCR Pipeline

- OCR processing SHALL convert file uploads to text asynchronously.
- Results SHALL augment essay versions.

## 10. Reporting and Analytics

- Reports SHALL cover student progress, class distributions, rubric breakdowns, anomalies, and cost control.

## 11. Async Queues

- Qu eues SHALL process grading, OCR, plagiarism, rollups, and webhooks with retry and dead-letter handling.

## 12. API and Rate Limiting

- Authenticated requests SHALL use JWT or API keys.
- Idempotency keys SHALL prevent duplicate operations.
- Rate limiting SHALL return HTTP 429 with Retry-After.

## 13. Audit and Compliance

- Auditing SHALL track all access and PII operations.
- Data retention shall be tenant-configurable.

## 14. Error Handling

- Common error codes SHALL guide client responses.
- Retry and backoff mechanisms SHALL mitigate transient failures.

## 15. Deployment and Scalability

- Kubernetes deployments SHALL enable HPA and blue-green releases.

## 16. Observability

- Distributed tracing and error monitoring SHALL provide operational insight.

## 17. Cost Governance

- Cost tracking and budget enforcement SHALL avoid overspending.

## 18. Developer Ergonomics

- SDKs and API docs SHALL improve developer experience.

## 19. Webhooks

- Secure, signed webhooks SHALL notify external systems.

## 20. Testing

- Comprehensive test coverage SHALL ensure system quality.

## 21. Appendix

- Diagrams and formulas provide technical clarity.


---

This document contains only business requirements. Technical implementation, architecture, and API definition decisions are delegated to the development team. It specifies WHAT needs to be done, not HOW.
