# AutoBe Hackathon 2025 Session

Generation Result of AutoBe Hackathon 2025 participant.

- id: [01994bcf-7911-76ca-8f63-5d7852fb1ef8](./01994bcf-7911-76ca-8f63-5d7852fb1ef8)
- participant: 임상하 (codingcorgi21@gmail.com)
- model: `openai/gpt-4.1-mini`
- phase: `analyze`
- title: null
- review: null

## 1. User Message

> You are AutoBE. Run the full pipeline in FAST MODE for the domain below.
> Do NOT ask clarifying questions. Assume reasonable defaults that respect my constraints.
> DO NOT write/export any files until I say **Finalize**. Keep everything IN-MEMORY and display inline.
> After each step, automatically proceed to the next step until Step 5 is done.
> 
> Domain: “Subscription & Renewal Guardian” — track personal subscriptions and upcoming renewals.
> 
> Locked decisions:
> - Roles: user (CRUD own data), admin (read-only, global).
> - Auth: JWT (email+password), no refresh.
> - Time: store UTC; business TZ Asia/Seoul.
> - Prisma/Postgres:
>   - vendor.name: case-insensitive unique via citext; trim on input.
>   - Enums: BillingCycle {DAILY,WEEKLY,MONTHLY,YEARLY}; SubscriptionStatus {ACTIVE,PAUSED,CANCELED}.
>   - subscriptions.amount: Decimal(12,2). Validate amount >= 0 at service layer.
>   - Uniques: vendor.name; subscriptions (user_id, vendor_id, plan_name).
>   - Index: subscriptions (user_id, next_renewal_at).
> - Business rules:
>   - next_renewal_at is persisted. Compute on create/update when billing_cycle/started_at change.
>   - PAUSE: freeze (no recompute). RESUME: recompute from now(UTC) until strictly > now.
>   - Upcoming: GET /subscriptions/upcoming?withinDays=30 (default 30, allow 1..365), exclude PAUSED/CANCELED, sort ASC by next_renewal_at.
>   - Duplicates → 409 (vendor name ci-unique; subscription tuple unique).
>   - Modify CANCELED → 409 (terminal). 401/403/404 as usual.
> 
> Step 1 — ANALYZE:
> - Produce a concise requirements report (one page). Then CONTINUE automatically.
> 
> Step 2 — PRISMA (DB/ERD):
> - Output Prisma schema files inline (main.prisma + 4 small schemas by namespace are fine).
> - Use PostgreSQL + citext. Keep it minimal and consistent with the locked rules.
> - Show a tiny ERD (ASCII/mermaid) inline. Then CONTINUE automatically.
> 
> Step 3 — INTERFACE (API spec):
> - Output a complete OpenAPI 3.1 YAML (inline) and a routes/DTOs table.
> - Endpoints:
>   - POST /auth/signup, POST /auth/login
>   - Vendors: POST /vendors, GET /vendors/:id, GET /vendors?limit&offset, PUT /vendors/:id  // no DELETE
>   - Subscriptions: POST /subscriptions, GET /subscriptions/:id, GET /subscriptions?limit&offset,
>                    PUT /subscriptions/:id, PATCH /subscriptions/:id/pause,
>                    PATCH /subscriptions/:id/resume, PATCH /subscriptions/:id/cancel
>   - Reminders (nested): POST /subscriptions/:id/reminders, GET /subscriptions/:id/reminders,
>                         DELETE /subscriptions/:id/reminders/:reminderId
>   - Upcoming: GET /subscriptions/upcoming?withinDays=30
> - DTO validation: amount decimal >=0; currency ISO-4217 3-letter uppercase; enums as above; vendor.name trim+citext.
> - Error model: {code,message,details?} with 400/401/403/404/409 examples.
> - Then CONTINUE automatically.
> 
> Step 4 — TEST (E2E):
> - Generate ONE test file inline: **tests/app.e2e.spec.ts** (Jest + supertest, TypeScript).
> - Fast boot: minimal NestJS app + Prisma; seed helper; mock Date.now where needed.
> - Happy:
>   1) signup/login → JWT
>   2) create vendor; list vendors
>   3) create subscription; list mine
>   4) upcoming (default 30 days)
>   5) pause → resume (resume recomputes next_renewal_at > now)
>   6) cancel (then any modify blocked)
> - Edges:
>   A) duplicate vendor (case-insensitive) → 409
>   B) duplicate (user_id,vendor_id,plan_name) → 409
>   C) negative amount / bad currency → 400
>   D) upcoming excludes PAUSED/CANCELED
>   E) modify CANCELED → 409
> - Keep assertions readable. Then CONTINUE automatically.
> 
> Step 5 — REALIZE (Implementation):
> - Implement only what is necessary to pass the above E2E tests; inline minimal NestJS modules/controllers/services and Prisma client calls.
> - When “tests” conceptually pass, output a short markdown with **Assumptions** and **Known limitations/TODOs**.
> - STOP and wait for my command **Finalize**.
> 
> Important:
> - Do NOT regenerate earlier steps. Keep outputs concise.
> - No file writes until I explicitly say **Finalize**.

## 2. Analyze

### Roles

Name | Kind | Description
-----|------|--------------
user | member | Authenticated user who can create, read, update, and delete their own subscription and vendor data. Can manage personal subscriptions and view upcoming renewals. 
admin | admin | System administrator with read-only access to all subscriptions and vendors across users for global oversight. Cannot modify user data. 

### Documents

- [`docs/analysis/00-toc.md`](./docs/analysis/00-toc.md)
- [`docs/analysis/01-service-overview.md`](./docs/analysis/01-service-overview.md)
- [`docs/analysis/02-user-roles.md`](./docs/analysis/02-user-roles.md)
- [`docs/analysis/03-functional-requirements.md`](./docs/analysis/03-functional-requirements.md)
- [`docs/analysis/04-user-stories.md`](./docs/analysis/04-user-stories.md)
- [`docs/analysis/05-error-handling.md`](./docs/analysis/05-error-handling.md)
- [`docs/analysis/06-business-rules.md`](./docs/analysis/06-business-rules.md)
- [`docs/analysis/07-security-compliance.md`](./docs/analysis/07-security-compliance.md)
- [`docs/analysis/08-performance.md`](./docs/analysis/08-performance.md)
- [`docs/analysis/09-system-context.md`](./docs/analysis/09-system-context.md)
- [`docs/analysis/10-future-roadmap.md`](./docs/analysis/10-future-roadmap.md)