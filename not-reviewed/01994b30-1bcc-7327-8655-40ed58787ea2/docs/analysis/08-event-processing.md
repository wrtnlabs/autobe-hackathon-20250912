# CREVERSE AI Essay Auto-Grading Backend API Specification

## 1) Architecture Overview

The CREVERSE AI Essay Auto-Grading platform is built on a robust, scalable backend architecture designed to support enterprise-grade essay evaluation at scale with multi-tenancy, async processing, AI integrations, and extensive audit and compliance features.

- **Core Stack**: NestJS (monorepo), TypeScript, Prisma ORM with PostgreSQL; Redis with BullMQ for queue management; Azure Blob Storage with SAS tokens for artifact storage; Azure OpenAI and Azure ML for LLM-based essay scoring.
- **Optional Components**: OpenSearch for advanced search capabilities; ClickHouse, BigQuery, or Azure Data Explorer for analytical data storage.
- **Observability**: Uses Sentry for error tracking and OpenTelemetry for distributed tracing.
- **Deployment**: Azure Kubernetes Service (AKS) with Horizontal Pod Autoscaling; Canary and Blue-Green deployments managed with Argo Rollouts; dynamic configuration through environment variables and Azure App Configuration.

### Service Modules

1. **auth**: Implements OIDC/JWT/SSO with robust RBAC, API key management, rate-limits, and quota enforcement.
2. **tenant**: Manages tenants, schools, classes with strict isolation and PostgreSQL Row-Level Security.
3. **user**: User profiles management with roles and enrollment.
4. **rubric**: Rubric templates, immutable versions, scoring criteria, anchors, weights, and publishing workflow.
5. **essay**: Handles essay submissions in text, upload, or OCR forms with versioning, normalization, and language support.
6. **grading**: Manages asynchronous scoring jobs with calibration, rescore capabilities, and model metadata tracking.
7. **plagiarism**: Supports scans via multiple providers or internal engines with match storage.
8. **ocr**: Asynchronous PDF and image OCR pipeline producing text versions.
9. **reports**: Aggregates rollups, trends, distributions, and outlier detection.
10. **audit**: Tracks audit trails, access logs, especially for PII operations.
11. **admin**: Feature flag management, system health checks, webhook configurations, and operational tools.

### Async Queues

- Managed with BullMQ for tasks including ocr:ingest, grading:score, plagiarism:scan, analytics:rollup, webhook:deliver.
- Dead-letter queues handle failures after retries.

## 2) Domain Model Highlights

- **Multi-Tenancy**: All data entities contain a tenant_id field. Tenant isolation is strictly enforced via PostgreSQL Row-Level Security and scoped JWT claims.
- **Rubrics**: Immutable versioning supports draft, published and deprecated states. Each rubric version contains criteria with anchored scoring and weights summing to 1.0.
- **Essays**: Support multiple submission sources, maintain original blobs with language metadata. Text versions are the grading units.
- **Grading**: A job binds an essay version with a rubric version and stores detailed scoring, feedback, calibration, and model metadata.
- **Plagiarism**: Scans store matched source spans and metadata per essay version.
- **Audit**: Records all meaningful actions including PII access flagged events.

## 3) Data Schema (Summary)

Data model designed with Prisma ORM including core tables for tenants, API keys, rubric templates and versions, essays and their versions, grading jobs, plagiarism scans, and audit logs. Business logic validation such as weights summing to 1.0 is enforced at the service layer rather than database constraints.

## 4) API Design Overview

- Base path /api/v1
- Authorization with JWT Bearer tokens or x-api-key headers
- Tenant scoping via x-tenant-id header
- Idempotency keys supported for safe repeated requests
- Pagination, sorting, and field filtering implemented via query parameters
- Consistent business-oriented error codes such as RUBRIC_INVALID, TENANT_FORBIDDEN

### Auth endpoints: login, me, API key management
### Tenant and organization management APIs
### Rubric blueprint CRUD and publishing lifecycle endpoints with validation
### Essay submission and version management APIs
### OCR ingestion requests and retrieval
### Grading job creation, status, cancellation, and batch operations
### Plagiarism scan initiation and querying
### Reports querying by students, classes, times, and rubrics
### Admin endpoints: flags, health, audit logs, webhooks

## 5) Scoring Pipeline

- Jobs enqueued with status queued, processed asynchronously by workers.
- Preprocessing includes language detection, text splitting, and censorship masking.
- Dynamic prompt construction injects rubric anchors and feedback tone.
- Calls to Azure OpenAI or ML models with automatic retry and backoff.
- Normalization and calibration applied, including length penalties and CEFR level mapping.
- Results stored with scores, feedback, model metadata, and plagiarism data.
- Notifications emitted by domain events and webhooks with HMAC signatures.
- Exponential retry with dead-letter queue for errors.

## 6) Custom Rubric Builder

- Multilevel version workflow with drafts, published versions that are immutable, and deprecated versions.
- Criteria must define keys, descriptors, and anchors with scoring examples.
- Flexible scale ranges (e.g., 0-5, 1-10) with weighting summing exactly to 1.0.
- Guardrails enforce minimum tokens, banned phrases, repetition limits, and language constraints.
- Rubrics scoped by class, school, tenant, or global levels with inheritance.
- Task-specific presets available (Narrative, Argumentative...)

## 7) Security and Compliance

- Roles: ADMIN, TEACHER, STUDENT, ANALYST with route-level and attribute-based access control.
- Tenant scoping strictly enforced with Postgres RLS.
- Minimal PII retention, encryption at rest, redacted logs.
- Full audit trail coverage, especially for PII access.
- Rate limits and quotas enforced at user and API-key level with HTTP 429 responses.
- Secrets management to use Azure Key Vault with scheduled rotation.
- GDPR-like data subject access and deletion via admin workflow.

## 8) Performance & Scalability

- Horizontal scaling with concurrency control per queue.
- HPA autoscaling based on CPU and custom metrics like queue depth.
- Batch chunking for grading 200 essays per job.
- Redis caching for rubric and frequent lookups.
- ETag and HTTP caching headers used.
- Read replicas and async materialized views for heavy analytics.

## 9) Observability

- OpenTelemetry distributed tracing from API ingress through queues to AI service calls.
- Sentry error monitoring with Slack & PagerDuty alerts.
- Dashboards showing queue depth, success rate, latency percentiles, and cost.

## 10) Error Model

- Standard error response format with codes and detailed messages.
- Enumerated error codes covering rubric validation, resource not found, rate limits, model errors, plagiarism timeouts, tenant violations, SAS expiry, webhook failures.

## 11) Controllers sketch

- Example NestJS controller methods with role guards and tenant scoping.

## 12) Model contract and prompt I/O

- Input: essayText and rubric JSON with scale bounds, weights, criteria, tone, optional guardrails
- Output: JSON scores by criteria, overall score, feedback, calibration metadata
- JSON schema validation with strict compliance enforced

## 13) Webhooks

- Events for grading, plagiarism, OCR completion.
- Signed payloads with retry and DLQ.
- Minimal PII data in webhook payloads with links to full results.

## 14) Deployment and Release

- Canary and blue-green deployments with feature flags.
- Forward-only DB migrations.
- Emergency rollback via model/provider flag switches and queue pausing.

## 15) Testing

- Jest unit and integration tests including contract testing.
- Golden data sets for regression.
- Load testing SLOs (p95 < 2s for sync read APIs).
- Chaos testing for fault injection.

## 16) Cost Governance

- Track token usage, latency, and cost profiled per job.
- Tenant-specific cost reporting and alerts.
- Auto-throttle at budget overruns.

## 17) Environment Variables

- DB, Redis, Azure Blob Storage, AOAI keys, concurrency and feature flags.

## 18) Sequence

- Submission to essay to OCR to grading to webhook notification flow.

## 19) Migration Guide

- Legacy rubric mapping, grading table freeze and backfill.

## 20) SLO & SLA

- 99.95% read API availability.
- 95% async grading completion within 5 minutes.
- 365 days retention configurable per tenant.

## 21) Developer Ergonomics

- OpenAPI 3.1 spec generation, typed SDKs, Postman collections, makefile tasks.

### Mermaid Diagrams
All diagrams fix to use double quotes for labels and correct arrow syntax.

---

This document specifies the complete set of actionable business requirements in natural language for backend implementation of the CREVERSE AI Essay Auto-Grading platform. It leaves all technical decisions such as database design, API implementation, and infrastructure details to developers, enabling autonomous design and development.