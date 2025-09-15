# CREVERSE AI Essay Auto-Grading Backend API - Business Requirements Analysis

## 1. Introduction

The CREVERSE AI Essay Auto-Grading platform is an enterprise-grade solution designed to provide scalable, consistent, and automated evaluation of student essays using AI-powered grading models and custom rubrics. It serves educational institutions, schools, and classes as tenants in a multi-tenant environment, delivering robust pipelines for essay submission, grading, plagiarism detection, OCR text extraction, reporting, and compliance.

## 2. Business Model

### Why This Service Exists
Educational institutions face challenges with manual essay grading, including inconsistent evaluation quality, high labor costs, and slow turnaround times. CREVERSE AI addresses these issues by automating grading using state-of-the-art language models combined with customizable rubrics, enabling large-scale, reliable assessment to improve educational outcomes.

### Revenue Strategy
The platform generates revenue via tiered subscriptions tailored to tenant sizes and usage levels, along with premium features such as advanced plagiarism scanning, detailed analytics, and expanded usage quotas.

### Growth Plan
Growth is driven through partnerships with school districts, integration with learning management systems, and continuous improvements to AI models and platform capabilities.

### Success Metrics
Key performance indicators include tenant adoption rates, essay volume processed monthly, average grading turnaround time, user satisfaction scores, and operational cost efficiency.

## 3. User Roles and Authentication

The system supports the following user roles with clearly defined permissions:

- **Guest:** Unauthenticated users limited to login and public endpoints.
- **Student:** Can submit essays, view their own grading results and reports.
- **Teacher:** Can create and manage rubric templates and versions, assign essays, review plagiarism reports, and generate reports.
- **Analyst:** Read-only access to analytics, audit logs, and cost governance data for operational insights.
- **Admin:** Full control over tenants, API key management, feature flags, audit logs, and system configuration.

Authentication utilizes OIDC and JWT tokens embedding tenant and role claims. Rate limits and quotas are enforced per user and API key.

## 4. Multi-Tenancy and Security

All data is scoped by tenant_id with PostgreSQL Row-Level Security enforcing isolation. API keys are scoped and quota-limited per tenant. Background jobs include tenant context. PII is minimally retained, encrypted, and redacted in logs. Audit trails capture all privileged actions and PII accesses.

## 5. Rubric Management

Rubric templates define customizable assessment criteria with weighted scoring anchors. Rubric versions progress from draft to published to deprecated. Business rules enforce total weights sum close to 1.0, integer scales with coverage of min/max/mid anchors, and optional guardrails such as banned phrases and minimum token counts. Published rubrics are immutable.

## 6. Essay Submission and Versioning

Essays can be submitted by direct text input, file upload to Azure Blob Storage via presigned SAS URLs, or OCR-extracted text. Each essay record maintains tenant, student, class context, language, and status. Multiple essay versions track original and processed text, with normalization flags.

## 7. Grading and Scoring

Grading jobs associate a specific essay version and rubric version, processed asynchronously through BullMQ queues. Preprocessing includes language detection and tokenization. Prompts include rubric anchors, tone, and guardrails. AI calls use Azure OpenAI/ML with retry and circuit breaker logic. Scores are normalized to 0-100 scales with optional calibration penalties. Feedback includes per-criterion qualitative responses. Grading jobs can be canceled and created in batches.

## 8. Plagiarism Detection

Plagiarism scanning jobs run asynchronously with provider-agnostic integration. Results store matched passages with sources and similarity scores. Timeouts and errors trigger retries and alerts.

## 9. OCR Pipeline

OCR converts PDF and image uploads to text asynchronously via BullMQ. Extracted text versions link to essays and provide metadata. Status tracking available via API.

## 10. Reporting and Analytics

Reports include student progress trends, class score distributions, rubric breakdowns, anomaly detections, and cost governance. Filtering by tenant, class, rubric, and date ranges supported. Heavy analytics use read replicas and cached materialized views.

## 11. Async Queues and Event Flows

Async queues managed via BullMQ cover grading scoring, OCR ingestion, plagiarism scanning, analytics rollups, and webhook delivery with retry and dead-letter queues. Retry strategy follows exponential backoff with max attempts.

## 12. API Usage and Rate Limits

Authentication via JWT or API keys with tenant-scoped headers. Idempotency keys supported for POST/PUT operations. Rate limits and quotas enforce fair use, returning HTTP 429 with Retry-After headers on breaches.

## 13. Audit and Compliance Logging

Audit logs capture all read/write/admin actions including PII access, recording actor, actions, IP, and timestamps. Logs queryable per tenant and preserved per retention policies compliant with GDPR-like laws.

## 14. Error Handling

Error codes such as RUBRIC_INVALID, ESSAY_NOT_FOUND, GRADING_RATE_LIMITED, and MODEL_PROVIDER_ERROR clearly identify failure types. Standardized JSON error responses provide actionable messages. Retry and DLQ mechanisms handle transient failures.

## 15. Deployment and Release

Deployment on AKS with Horizontal Pod Autoscaling and feature-flag controlled canary/blue-green rollouts. Forward-only DB migrations ensure production stability. Emergency rollback possible by switching providers or pausing queues.

## 16. Observability

Tracing spans propagate from HTTP requests through queues to AI model calls using OpenTelemetry. Errors captured with Sentry linked to Slack and PagerDuty alerts. Operational dashboards display queue metrics, latency percentiles, token usage, and webhook health.

## 17. Testing and QA

Comprehensive test suite with unit, integration, contract, load, and chaos tests. Regression datasets ensure grading consistency. Load tests target p95 latency under 2 seconds for sync reads and async completeness within 5 minutes.

## 18. Cost Governance

Costs tracked per job for token counts, latency, and provider charges. Reports by tenant, class, and model enable financial monitoring. Auto-throttling triggers on budget overruns with tenant notification.

## 19. Administration and Operations

Admin users manage feature flags, audit log inspections, system health, and webhook registrations with retry policies. Operations tools monitor queues, job states, and webhook retries.

## 20. Sequence and Flow Diagrams

Key workflows such as essay submission to scoring, OCR processing, grading job lifecycle, and webhook delivery are illustrated with Mermaid diagrams using correct syntax.

## Appendix

Includes calibration formulas, Redis key usage, and schema uniqueness constraints. Sample OpenAPI snippets exemplify API request/response structures.


---

This document provides business requirements only. Technical implementation details including architecture, API design, and database schemas are at the sole discretion of the development team. It defines WHAT the system should do, not HOW to build it.