# AutoBe Hackathon 2025 Session

Generation Result of AutoBe Hackathon 2025 participant.

- id: [01994b30-1bcc-7327-8655-40ed58787ea2](./01994b30-1bcc-7327-8655-40ed58787ea2)
- participant: 손재명 (jaemyeongson@kakao.com)
- model: `openai/gpt-4.1-mini`
- phase: `prisma`
- title: null
- review: null

## 1. User Message

> CREVERSE AI Essay Auto‑Grading — NestJS Backend API Specification (Business‑Ready, v2 EN)
> 
> 
> 
> 
> 
> Goal: An enterprise‑grade, multi‑tenant NestJS platform to evaluate essays at scale with custom rubric builder, robust async pipelines, audit/compliance, cost controls, and analytics. This version expands functional depth and English terminology for production use.
> 
> 
> 
> 
> 
> 
> 
> 1) Architecture Overview
> 
> 
> 
> 
> 
> 
> 
> Core Stack: NestJS (monorepo), TypeScript, Prisma(ORM) → PostgreSQL; Redis(BullMQ) for queues; Azure Blob Storage(SAS) for artifacts; Azure OpenAI / Azure ML for LLM scoring; Optional: OpenSearch for search; ClickHouse (or BigQuery/Azure Data Explorer) for analytics; Sentry + OpenTelemetry for observability.
> 
> 
> 
> 
> 
> 
> 
> 
> Service Modules
> 
> 
> 
> 
> 
> 
> 
> 
> auth: OIDC/JWT/SSO, RBAC, API Keys, rate‑limits & quotas
> 
> 
> 
> 
> 
> 
> 
> 
> tenant: tenants/schools/classes, isolation & RLS
> 
> 
> 
> 
> 
> 
> 
> 
> user: profiles, roles, enrollment
> 
> 
> 
> 
> 
> 
> 
> 
> rubric: templates, versions, criteria, anchors, weights, publishing
> 
> 
> 
> 
> 
> 
> 
> 
> essay: submissions, versions, artifacts, normalization
> 
> 
> 
> 
> 
> 
> 
> 
> grading: scoring jobs, calibration, rescore, model meta
> 
> 
> 
> 
> 
> 
> 
> 
> plagiarism: scans via providers or internal engine
> 
> 
> 
> 
> 
> 
> 
> 
> ocr: pdf/image → text pipeline
> 
> 
> 
> 
> 
> 
> 
> 
> reports: rollups, trends, distributions, outliers
> 
> 
> 
> 
> 
> 
> 
> 
> audit: audit trails, access logs, PII access
> 
> 
> 
> 
> 
> 
> 
> 
> admin: feature flags, health, webhooks, ops tools
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 
> Async Queues (BullMQ): ocr:ingest, grading:score, plagiarism:scan, analytics:rollup, webhook:deliver with DLQs.
> 
> 
> 
> 
> 
> 
> 
> 
> Deployment: AKS + HPA; Canary/Blue‑Green (Argo Rollouts); config via ENV/Azure App Config; read‑only replicas for heavy queries.
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 2) Domain Model (Highlights)
> 
> 
> 
> 
> 
> 
> 
> Multi‑Tenancy: All rows carry tenant_id; enforce Postgres RLS + scoped JWT claims. Separate per‑tenant API keys & quotas.
> 
> 
> 
> 
> 
> 
> 
> 
> Rubric (immutable versions): draft → published → deprecated. Criteria(anchors & descriptors), scale range, per‑criterion weights (sum=1.0).
> 
> 
> 
> 
> 
> 
> 
> 
> Essay: supports text|upload|ocr; keeps original blob, language, versions. Versioned text is the scoring unit.
> 
> 
> 
> 
> 
> 
> 
> 
> Grading: job entity binds essayVersion + rubricVersion and stores scores, per‑criterion feedback, model meta, calibration and any normalization.
> 
> 
> 
> 
> 
> 
> 
> 
> Plagiarism: provider‑agnostic; stores matches with source spans.
> 
> 
> 
> 
> 
> 
> 
> 
> Audit: read/write/admin actions including PII reads.
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 3) Data Schema (Prisma, condensed + new fields)
> 
> 
> model Tenant {
>   id        String   @id @default(cuid())
>   name      String
>   status    String   @default("active")
>   createdAt DateTime @default(now())
>   updatedAt DateTime @updatedAt
>   Users     User[]
>   Schools   School[]
>   ApiKeys   ApiKey[]
> }
> 
> model ApiKey {
>   id        String   @id @default(cuid())
>   tenantId  String
>   name      String
>   hash      String   // hashed key
>   scopes    String[] // ["read:gradings","write:gradings"]
>   quota     Int?     // monthly calls
>   createdAt DateTime @default(now())
>   revokedAt DateTime?
>   Tenant    Tenant   @relation(fields: [tenantId], references: [id])
> }
> 
> model RubricTemplate {
>   id          String   @id @default(cuid())
>   tenantId    String
>   name        String
>   language    String // "en"|"ko"
>   scope       String // class|school|tenant|global
>   createdById String
>   createdAt   DateTime @default(now())
>   updatedAt   DateTime @updatedAt
>   Versions    RubricVersion[]
> }
> 
> model RubricVersion {
>   id            String   @id @default(cuid())
>   templateId    String
>   version       Int
>   status        String   // draft|published|deprecated
>   description   String?
>   scaleMin      Int      @default(0)
>   scaleMax      Int      @default(5)
>   weights       Json     // {"content":0.3,...}
>   criteria      Json     // anchors & descriptors
>   guardrails    Json?    // forbidden phrases, min length, etc.
>   createdById   String
>   createdAt     DateTime @default(now())
>   publishedAt   DateTime?
>   RubricTemplate RubricTemplate @relation(fields: [templateId], references: [id])
>   @@unique([templateId, version])
> }
> 
> model Essay {
>   id           String   @id @default(cuid())
>   tenantId     String
>   studentId    String
>   classId      String?
>   title        String?
>   sourceType   String   // upload|text|ocr
>   originalBlob String?
>   language     String
>   status       String   @default("received")
>   createdAt    DateTime @default(now())
>   updatedAt    DateTime @updatedAt
>   Versions     EssayVersion[]
>   @@index([tenantId, classId, createdAt])
> }
> 
> model EssayVersion {
>   id          String   @id @default(cuid())
>   essayId     String
>   text        String
>   tokens      Int?
>   ocrMeta     Json?
>   normalized  Boolean  @default(false)
>   createdAt   DateTime @default(now())
>   Essay       Essay    @relation(fields: [essayId], references: [id])
>   Gradings    Grading[]
> }
> 
> model Grading {
>   id              String   @id @default(cuid())
>   tenantId        String
>   essayVersionId  String
>   rubricVersionId String
>   status          String   @default("queued")
>   scores          Json?
>   overallScore    Float?
>   feedback        Json?    // {perCriterion:{...}, tone}
>   calibration     Json?    // length penalty, CEFR mapping
>   modelMeta       Json?    // provider/model/tokens/latency/cost
>   error           Json?
>   createdAt       DateTime @default(now())
>   completedAt     DateTime?
>   EssayVersion    EssayVersion @relation(fields: [essayVersionId], references: [id])
>   RubricVersion   RubricVersion @relation(fields: [rubricVersionId], references: [id])
>   @@index([tenantId, status, createdAt])
> }
> 
> model PlagiarismScan {
>   id             String   @id @default(cuid())
>   essayVersionId String
>   provider       String   // turnitin|internal
>   status         String   @default("queued")
>   score          Float?
>   matches        Json?
>   createdAt      DateTime @default(now())
>   completedAt    DateTime?
> }
> 
> model AuditLog {
>   id         String   @id @default(cuid())
>   tenantId   String
>   actorId    String?
>   action     String   // rubric.publish, grading.create, essay.view
>   entityType String
>   entityId   String
>   metadata   Json?
>   ip         String?
>   createdAt  DateTime @default(now())
>   @@index([tenantId, action, createdAt])
> }
> 
> 
> 
> 
> 
> 
> Indices & Constraints: add composite indexes for hot paths; enforce weights sum ≈ 1.0 at service layer; use partial indexes for status filters.
> 
> 
> 
> 
> 
> 
> 
> 4) API Design (OpenAPI 3.1 summary)
> 
> 
> 
> Conventions: Base /api/v1; Authorization: Bearer <JWT> or x-api-key; x-tenant-id header for admin/service calls; Idempotency-Key for POST/PUT; pagination ?page&size, sorting ?sort=-createdAt, field filtering ?fields=....
> 
> 
> 
> 4.1 Auth
> 
> 
> 
> 
> 
> 
> 
> POST /auth/login (OIDC code exchange or email/password) → JWT w/ tenant claims
> 
> 
> 
> 
> 
> 
> 
> 
> GET /auth/me
> 
> 
> 
> 
> 
> 
> 
> 
> POST /auth/keys (ADMIN) → create API key with scopes, quotas
> 
> 
> 
> 
> 
> 
> 
> 4.2 Tenant/Org
> 
> 
> 
> 
> 
> 
> 
> GET /tenants/:id — admin only
> 
> 
> 
> 
> 
> 
> 
> 
> GET /schools?tenantId= GET /classes?schoolId=
> 
> 
> 
> 
> 
> 
> 
> 
> GET /enrollments?classId=&role=student
> 
> 
> 
> 
> 
> 
> 
> 4.3 Rubric (Builder & Publishing)
> 
> 
> 
> 
> 
> 
> 
> POST /rubrics/templates — create template (name, language, scope)
> 
> 
> 
> 
> 
> 
> 
> 
> POST /rubrics/:templateId/versions — create draft version
> 
> 
> 
> 
> 
> 
> 
> 
> PUT /rubrics/versions/:id — edit criteria/anchors/weights/scale/guardrails
> 
> 
> 
> 
> 
> 
> 
> 
> POST /rubrics/versions/:id/validate — validate weights, gaps, anchor coverage
> 
> 
> 
> 
> 
> 
> 
> 
> POST /rubrics/versions/:id/publish — immutable after publish
> 
> 
> 
> 
> 
> 
> 
> 
> GET /rubrics/templates/:id GET /rubrics/versions/:id
> 
> 
> 
> 
> 
> 
> 
> 
> GET /rubrics/search?query=&scope=&status=&language=
> 
> 
> 
> 
> 
> 
> 
> 
> Draft Validation Rules
> 
> 
> 
> 
> 
> 
> 
> 
> weights sum within [0.999,1.001]
> 
> 
> 
> 
> 
> 
> 
> 
> every criterion has ≥1 anchor per boundary (min/max) + at least one mid anchor
> 
> 
> 
> 
> 
> 
> 
> 
> scaleMin < scaleMax, integer scales only
> 
> 
> 
> 
> 
> 
> 
> 
> optional guardrails: min tokens, banned phrases, max repetition
> 
> 
> 
> 
> 
> 
> 
> 4.4 Essay
> 
> 
> 
> 
> 
> 
> 
> POST /essays/upload → presigned SAS (PUT)
> 
> 
> 
> 
> 
> 
> 
> 
> POST /essays → {blobUrl|text, language, classId?, title?}
> 
> 
> 
> 
> 
> 
> 
> 
> POST /essays/:id/versions → add normalized text or OCR result
> 
> 
> 
> 
> 
> 
> 
> 
> GET /essays/:id GET /essays/:id/versions
> 
> 
> 
> 
> 
> 
> 
> 
> GET /essays/search?studentId=&classId=&q=&from=&to=&language=
> 
> 
> 
> 
> 
> 
> 
> 4.5 OCR
> 
> 
> 
> 
> 
> 
> 
> POST /ocr/requests → { essayId, blobUrl, langHint } → enqueue ocr:ingest
> 
> 
> 
> 
> 
> 
> 
> 
> GET /ocr/requests/:id → status + output text blob
> 
> 
> 
> 
> 
> 
> 
> 4.6 Grading
> 
> 
> 
> 
> 
> 
> 
> POST /gradings → create scoring job
> 
> 
> 
> 
> 
> 
> 
> 
> Body
> 
> 
> 
> 
> 
> 
> 
> {
>   "essayVersionId":"...",
>   "rubricVersionId":"...",
>   "options":{
>     "tone":"student",
>     "model":"gpt-4o-mini",
>     "normalize":true,
>     "withPlagiarism":true,
>     "calibration": {"lengthPenalty":0.05, "targetLevel":"B2"}
>   }
> }
> 
> 
> 
> 
> 
> 
> 
> 
> GET /gradings/:id — status/result
> 
> 
> 
> 
> 
> 
> 
> 
> POST /gradings/batch — list of (essayVersionId,rubricVersionId)
> 
> 
> 
> 
> 
> 
> 
> 
> POST /gradings/:id/cancel
> 
> 
> 
> 
> 
> 
> 
> 
> GET /gradings/search?status=&classId=&rubricVersionId=&from=&to=&minScore=&maxScore=
> 
> 
> 
> 
> 
> 
> 
> 
> Result JSON
> 
> 
> 
> {
>   "status":"succeeded",
>   "overallScore": 83.5, // normalized 0-100 if configured
>   "rawOverall": 18.4,   // raw on rubric scale
>   "scores":{
>     "content":{"score":4.6,"feedback":"Strong alignment with thesis; add more evidence."},
>     "organization":{"score":3.8,"feedback":"Transitions okay; conclusion summary is weak."},
>     "grammar":{"score":4.2,"feedback":"Minor issues only."},
>     "vocabulary":{"score":2.9,"feedback":"Increase lexical variety with topic‑specific terms."},
>     "creativity":{"score":2.9,"feedback":"Examples feel generic; add a personal anecdote."}
>   },
>   "feedbackTone":"student",
>   "calibration":{"lengthPenaltyApplied":0.03,"level":"B2"},
>   "modelMeta":{"provider":"azure-openai","model":"gpt-4o-mini","inputTokens":1532,"outputTokens":312,"latencyMs":1840,"cost":0.0045},
>   "plagiarism":{"score":7.1,"matches":[{"source":"web","percent":4.3,"span":[120,188]}]}
> }
> 
> 
> 
> 4.7 Plagiarism
> 
> 
> 
> 
> 
> 
> 
> POST /plagiarism/scans → enqueue scan for an essay version
> 
> 
> 
> 
> 
> 
> 
> 
> GET /plagiarism/scans/:id
> 
> 
> 
> 
> 
> 
> 
> 4.8 Reports/Analytics
> 
> 
> 
> 
> 
> 
> 
> GET /reports/progress?studentId=&from=&to= — per‑criterion trend
> 
> 
> 
> 
> 
> 
> 
> 
> GET /reports/class-distribution?classId=&rubricVersionId= — histogram, outliers
> 
> 
> 
> 
> 
> 
> 
> 
> GET /reports/rubric-breakdown?rubricVersionId=&from=&to=
> 
> 
> 
> 
> 
> 
> 
> 
> GET /reports/anomalies?classId=&from=&to= — abnormal length/score combos
> 
> 
> 
> 
> 
> 
> 
> 
> GET /reports/costs?from=&to=&groupBy=tenant|class|model — usage & cost governance
> 
> 
> 
> 
> 
> 
> 
> 4.9 Admin/Ops
> 
> 
> 
> 
> 
> 
> 
> GET /admin/flags PUT /admin/flags/:key
> 
> 
> 
> 
> 
> 
> 
> 
> GET /admin/health — liveness/readiness + dependencies
> 
> 
> 
> 
> 
> 
> 
> 
> GET /admin/audit?actorId=&action=&from=&to=
> 
> 
> 
> 
> 
> 
> 
> 
> POST /admin/webhooks — register/update endpoints with retry policies
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 5) Scoring Pipeline (Detailed)
> 
> 
> 
> 
> 
> 
> 
> Enqueue: create job row (queued) + BullMQ add(grading:score, jobId=idempotency)
> 
> 
> 
> 
> 
> 
> 
> 
> Preprocess: language detect, sentence split, profanity mask, min‑len check
> 
> 
> 
> 
> 
> 
> 
> 
> Prompt Build: inject rubric anchors/weights, tone, guardrails; JSON schema enforcement
> 
> 
> 
> 
> 
> 
> 
> 
> Call LLM: Azure OpenAI/ML with retry(backoff), circuit breaker; capture tokens/latency/cost
> 
> 
> 
> 
> 
> 
> 
> 
> Normalization & Calibration: map raw to normalized (0‑100), apply length penalties or CEFR‑based scaling if configured
> 
> 
> 
> 
> 
> 
> 
> 
> Persist: scores/feedback/modelMeta; emit domain event grading.completed
> 
> 
> 
> 
> 
> 
> 
> 
> Optional Plagiarism: parallel or chained execution
> 
> 
> 
> 
> 
> 
> 
> 
> Notify: webhook delivery with signed HMAC; retry + DLQ
> 
> 
> 
> 
> 
> 
> 
> 
> Retry Strategy: exponential (0.5s → 30s; max 5); DLQ after max attempts; poison‑pill detection by error codes.
> 
> 
> 
> 
> 
> 6) Custom Rubric Builder (UX/API Rules)
> 
> 
> 
> 
> 
> 
> 
> Version workflow: Draft → Publish (immutable); cloning for minor tweaks
> 
> 
> 
> 
> 
> 
> 
> 
> Criteria must define: key, descriptor, anchors[{score,desc,examples[]?}]
> 
> 
> 
> 
> 
> 
> 
> 
> Scale flexibility (e.g., 1–10 or 0–5). Weights must sum==1.0
> 
> 
> 
> 
> 
> 
> 
> 
> Guardrails per rubric version: min tokens, banned phrases, repetition limit, allowed language(s)
> 
> 
> 
> 
> 
> 
> 
> 
> Presets by task type: Narrative/Argumentative/Expository/Summary
> 
> 
> 
> 
> 
> 
> 
> 
> Scope: class/school/tenant/global sharing with inheritance
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 7) Security & Compliance
> 
> 
> 
> 
> 
> 
> 
> RBAC: ADMIN/TEACHER/STUDENT/ANALYST, route‑level guards; attribute‑based checks (class membership)
> 
> 
> 
> 
> 
> 
> 
> 
> Isolation: enforce tenant_id filters + Postgres RLS; background jobs include tenant claim
> 
> 
> 
> 
> 
> 
> 
> 
> PII: minimal retention; encryption at rest; redact in logs; signed URLs for artifacts
> 
> 
> 
> 
> 
> 
> 
> 
> Audit: view/download/delete/publish actions; PII access flagged
> 
> 
> 
> 
> 
> 
> 
> 
> Rate Limits & Quotas: per user & per API key; 429 with Retry‑After
> 
> 
> 
> 
> 
> 
> 
> 
> Key Management: Azure Key Vault; scheduled rotation; zero‑trust secrets in CI/CD
> 
> 
> 
> 
> 
> 
> 
> 
> Compliance: GDPR‑like subject access & deletion endpoints (admin‑mediated); retention policies per tenant
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 8) Performance & Scalability
> 
> 
> 
> 
> 
> 
> 
> Horizontal scale workers; concurrency per queue (e.g., grading=8, ocr=4)
> 
> 
> 
> 
> 
> 
> 
> 
> HPA on CPU + custom metrics (queue depth, p95 latency)
> 
> 
> 
> 
> 
> 
> 
> 
> Batch chunking (e.g., 200 essays per job); idempotent batch
> 
> 
> 
> 
> 
> 
> 
> 
> Caching: rubric versions (JSON) & frequent lookups in Redis; ETag/If‑None‑Match on reads
> 
> 
> 
> 
> 
> 
> 
> 
> Read replicas for heavy analytics; async materialized views for reports
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 9) Observability
> 
> 
> 
> 
> 
> 
> 
> OpenTelemetry traces span HTTP → queue → model calls; propagate traceId
> 
> 
> 
> 
> 
> 
> 
> 
> Sentry for errors; Slack/PagerDuty integration for sev alerts
> 
> 
> 
> 
> 
> 
> 
> 
> Ops Dashboard: queue depth, success rate, p95, token & cost metrics, webhook failures
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 10) Error Model & Standard Responses
> 
> 
> { "error": { "code":"RUBRIC_INVALID", "message":"Weights must sum to 1.0", "details": {"sum":1.12} } }
> 
> 
> 
> 
> Common Codes: RUBRIC_INVALID, RUBRIC_VERSION_IMMUTABLE, ESSAY_NOT_FOUND, GRADING_RATE_LIMITED, MODEL_PROVIDER_ERROR, PLAGIARISM_TIMEOUT, TENANT_FORBIDDEN, FILE_SAS_EXPIRED, WEBHOOK_RETRIES_EXHAUSTED.
> 
> 
> 
> 
> 
> 11) Controllers (Sketch)
> 
> 
> @Post()
> @UseGuards(JwtAuthGuard, RbacGuard)
> create(@Body() dto: CreateGradingDto, @Req() req) {
>   return this.service.enqueue({ ...dto, tenantId: req.tenant.id, actorId: req.user.id });
> }
> 
> @Get(':id')
> findOne(@Param('id') id: string, @Req() req) {
>   return this.service.getById({ id, tenantId: req.tenant.id });
> }
> 
> 
> 
> 
> 
> 12) Model Contract (Prompt IO)
> 
> 
> 
> 
> 
> 
> 
> Input: { essayText, rubric:{scaleMin,scaleMax,weights,criteria[]}, tone, guardrails? }
> 
> 
> 
> 
> 
> 
> 
> 
> Output (JSON mode enforced): { scores:{key:{score,feedback}}, overallScore, rawOverall?, calibration?, reasoning? }
> 
> 
> 
> 
> 
> 
> 
> 
> JSON schema validated with Ajv; non‑compliance triggers retry with stricter guardrails.
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 13) Webhooks
> 
> 
> 
> 
> 
> 
> 
> Events: grading.completed, plagiarism.completed, ocr.completed
> 
> 
> 
> 
> 
> 
> 
> 
> Delivery: POST with X‑CREV‑Signature (HMAC‑SHA256) and X‑CREV‑Event‑Id
> 
> 
> 
> 
> 
> 
> 
> 
> Retry: 3‑5 exponential; then DLQ and admin alert
> 
> 
> 
> 
> 
> 
> 
> 
> Payload (grading): minimal PII; includes links to fetch full result via API
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 14) Deployment & Release
> 
> 
> 
> 
> 
> 
> 
> Canary rollout with feature flags to switch models/prompts
> 
> 
> 
> 
> 
> 
> 
> 
> Forward‑only DB migrations; rubric version immutability contract
> 
> 
> 
> 
> 
> 
> 
> 
> Emergency rollback playbook: switch provider/model via flag; pause queues
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 15) Testing & Quality Gates
> 
> 
> 
> 
> 
> 
> 
> Jest unit/integration; contract tests for workers
> 
> 
> 
> 
> 
> 
> 
> 
> Golden datasets per rubric to detect regressions
> 
> 
> 
> 
> 
> 
> 
> 
> Load tests (k6): p95 < 2s for sync reads; async SLO for grading
> 
> 
> 
> 
> 
> 
> 
> 
> Chaos: inject model timeouts/network faults
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 16) Cost Governance
> 
> 
> 
> 
> 
> 
> 
> Track per‑job token, latency, cost (by model/provider)
> 
> 
> 
> 
> 
> 
> 
> 
> GET /reports/costs for tenant and org finance
> 
> 
> 
> 
> 
> 
> 
> 
> Auto‑throttle when burn rate exceeds budget; surface in admin flags
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 17) Env Vars (sample)
> 
> 
> DATABASE_URL=postgres://...
> REDIS_URL=redis://...
> AZURE_BLOB_ACCOUNT=...
> AZURE_BLOB_SAS_TTL=3600
> AOAI_ENDPOINT=...
> AOAI_DEPLOYMENT=gpt-4o-mini
> AOAI_API_KEY=...
> QUEUE_CONCURRENCY_GRADING=8
> FEATURE_FLAGS_JSON={"plagiarism":"internal"}
> WEBHOOK_SECRET=...
> 
> 
> 
> 
> 
> 18) Sequence (Text Diagram)
> 
> 
> 
> 
> 
> 
> 
> POST /essays → Essay(received)
> 
> 
> 
> 
> 
> 
> 
> 
> POST /ocr/requests → ocr:ingest → EssayVersion(text)
> 
> 
> 
> 
> 
> 
> 
> 
> POST /gradings → grading:score → model call → persist result
> 
> 
> 
> 
> 
> 
> 
> 
> grading.completed → webhook/email/Slack
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 19) Migration Guide
> 
> 
> 
> 
> 
> 
> 
> Map legacy rubric rules → Template/Version via script
> 
> 
> 
> 
> 
> 
> 
> 
> Freeze legacy grading tables after ETL
> 
> 
> 
> 
> 
> 
> 
> 
> Backfill calibration fields for historical jobs
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 20) SLO/SLA (Proposal)
> 
> 
> 
> 
> 
> 
> 
> Read APIs availability 99.95%
> 
> 
> 
> 
> 
> 
> 
> 
> Async grading: 95% jobs under 5 minutes (median essay length)
> 
> 
> 
> 
> 
> 
> 
> 
> Retention: audit & detailed results 365 days (tenant‑configurable)
> 
> 
> 
> 
> 
> 
> 
> 
> 
> 21) Developer Ergonomics
> 
> 
> 
> 
> 
> 
> 
> Auto‑generated OpenAPI 3.1 + typed SDK (TS)
> 
> 
> 
> 
> 
> 
> 
> 
> Postman collection + seed scripts + smoke tests
> 
> 
> 
> 
> 
> 
> 
> 
> Makefile tasks: make dev, make migrate, make seed, make e2e
> 
> 
> 
> 
> 
> 
> 
> 
> 
> Appendix A — OpenAPI Snippet (YAML)
> 
> 
> openapi: 3.1.0
> info:
>   title: CREVERSE Essay Grading API
>   version: 1.0.0
> paths:
>   /gradings:
>     post:
>       summary: Create grading job
>       requestBody:
>         required: true
>         content:
>           application/json:
>             schema:
>               $ref: '#/components/schemas/CreateGradingRequest'
>       responses:
>         '202': { description: Accepted }
>   /gradings/{id}:
>     get:
>       summary: Get grading result
>       responses:
>         '200': { description: OK }
> components:
>   schemas:
>     CreateGradingRequest:
>       type: object
>       required: [essayVersionId, rubricVersionId]
>       properties:
>         essayVersionId: { type: string }
>         rubricVersionId: { type: string }
>         options:
>           type: object
>           properties:
>             tone: { enum: [student, teacher] }
>             model: { type: string }
>             normalize: { type: boolean }
>             withPlagiarism: { type: boolean }
> 
> 
> 
> Appendix B — RLS Policy Sketch
> 
> 
> 
> 
> 
> 
> 
> USING (tenant_id = current_setting('app.tenant_id')::text) on tenant‑scoped tables
> 
> 
> 
> 
> 
> 
> 
> 
> Set app.tenant_id per connection via Nest interceptor (pg session var)
> 
> 
> 
> 
> 
> 
> 
> Appendix C — Redis Keys
> 
> 
> 
> 
> 
> 
> 
> grading:job:{id} for transient state
> 
> 
> 
> 
> 
> 
> 
> 
> webhook:retry:{eventId} backoff state
> 
> 
> 
> 
> 
> 
> 
> Appendix D — Calibration Formula (example)
> 
> 
> normalized = (raw - scaleMin) / (scaleMax - scaleMin) * 100 - lengthPenalty
> lengthPenalty = clamp(alpha * max(0, minLen - actualLen) / minLen, 0, 10)
> 
> 
> 
> 
> 
> 
> This document is ready to be converted into concrete OpenAPI/Prisma files, Nest modules, and CI/CD pipelines immediately.

## 2. Assistant Message

> Thank you for providing the detailed CREVERSE AI Essay Auto-Grading NestJS Backend API Specification. This is an impressive and comprehensive specification with a clearly defined architecture, domain model, data schema, API design, security, scalability, and more.
> 
> To proceed efficiently, I want to confirm your immediate goal:
> 
> 1. Are you looking for me to help you generate the backend server's concrete implementation starting with the analysis stage for this specification?  
> 2. Do you want to review and discuss any specific parts of the specification first, such as data modeling, API endpoints, or authentication?  
> 3. Or is there any specific functionality or module you want to focus on initially?  
> 
> Please let me know your priorities or if you want me to take this specification and proceed with planning for the next step.

## 3. User Message

> 1

## 4. Assistant Message

> Great! Since you want to proceed with the implementation starting with the analysis stage, I will begin by running the Analyze agent on the detailed specification you provided. This will convert your comprehensive requirements into a structured requirements specification document.
> 
> Starting the analysis now.

## 5. Analyze

### Roles

Name | Kind | Description
-----|------|--------------
guest | guest | Unauthenticated users or minimal permission users who can only access public or login resources. 
student | member | Students who submit essays, view grading feedback, and access their own reports. 
teacher | member | Teachers who create and manage rubrics, assign essays for grading, view and analyze reports, and moderate plagiarism scans. 
analyst | member | Analysts who access detailed analytics, audits, cost governance reports, and have readonly access for operational insights. 
admin | admin | System administrators who manage tenants, API keys, feature flags, perform audit reviews, and have full system control. 

### Documents

- [`docs/analysis/00-toc.md`](./docs/analysis/00-toc.md)
- [`docs/analysis/01-service-overview.md`](./docs/analysis/01-service-overview.md)
- [`docs/analysis/02-user-roles.md`](./docs/analysis/02-user-roles.md)
- [`docs/analysis/03-functional-requirements.md`](./docs/analysis/03-functional-requirements.md)
- [`docs/analysis/04-security-compliance.md`](./docs/analysis/04-security-compliance.md)
- [`docs/analysis/05-external-integrations.md`](./docs/analysis/05-external-integrations.md)
- [`docs/analysis/06-data-flow-lifecycle.md`](./docs/analysis/06-data-flow-lifecycle.md)
- [`docs/analysis/07-business-rules.md`](./docs/analysis/07-business-rules.md)
- [`docs/analysis/08-event-processing.md`](./docs/analysis/08-event-processing.md)
- [`docs/analysis/09-performance-scalability.md`](./docs/analysis/09-performance-scalability.md)
- [`docs/analysis/10-observability.md`](./docs/analysis/10-observability.md)
- [`docs/analysis/11-error-handling.md`](./docs/analysis/11-error-handling.md)
- [`docs/analysis/12-admin-operations.md`](./docs/analysis/12-admin-operations.md)
- [`docs/analysis/13-deployment-release.md`](./docs/analysis/13-deployment-release.md)
- [`docs/analysis/14-testing-quality.md`](./docs/analysis/14-testing-quality.md)
- [`docs/analysis/15-cost-governance.md`](./docs/analysis/15-cost-governance.md)

## 6. User Message

> lets go

## 7. Assistant Message

> The initial analysis of your comprehensive CREVERSE AI Essay Auto-Grading NestJS backend API specification is successfully completed. We now have a structured understanding of your requirements.
> 
> Next, we need to generate the database schema and ERD documentation that reflect your specified domain model and data entities using the Prisma agent.
> 
> Shall I proceed to create the Prisma schema files and ERD documentation based on the current analyzed requirements?

## 8. User Message

> yes

## 9. Prisma

- document: [`docs/ERD.md`](./docs/ERD.md)
- namespaces: 10
- tables: 40
- success: true