# Subscription & Renewal Guardian Requirement Analysis Report

## Introduction
The Subscription & Renewal Guardian service is designed to help individual users track and manage their personal subscriptions and upcoming renewal dates with ease and accuracy. The system enables users to maintain detailed vendor and subscription records, receive timely renewal reminders, and view upcoming renewals within a configurable timeframe.

## Business Model

### Why This Service Exists
The Subscription & Renewal Guardian service solves the prevalent problem that users have with tracking numerous subscription services across various vendors with different billing cycles. Often, users miss renewal dates, leading to unexpected charges or service disruptions. This service fills a market gap by providing centralized subscription management with renewal notifications.

### Revenue Strategy
The service may initially be offered for free with revenue opportunities arising from premium features like advanced alerts, analytics, cross-device sync, or targeted advertising.

### Growth Plan
User onboarding focuses on simplicity with seamless subscription addition, retention via timely renewal reminders, and growth through expanding supported vendors and billing cycles.

### Success Metrics
Success is measured by metrics including monthly active users, renewal tracking accuracy, duplicate prevention rates, and user retention.

## User Roles and Authentication

### Roles
- **User:** Can create, read, update, and delete their own vendors and subscriptions, controlling personal subscription data and renewal tracking.
- **Admin:** Has read-only, global access to all users' subscriptions and vendors for monitoring and oversight, without modification privileges.

### Authentication
- The system uses JWT tokens issued on successful login via email and password.
- Tokens are stateless with no refresh mechanism.
- User credentials are validated properly at signup and login.

## Functional Requirements

### Vendor Management
- Users can create vendors with a unique name that is case-insensitive and trimmed of whitespace.
- Vendor deletion is disallowed.
- Duplicate vendor name creation attempts result in a 409 Conflict error.

### Subscription Management
- Subscriptions are uniquely identified by (user_id, vendor_id, plan_name).
- Fields include amount (decimal >= 0), currency (ISO-4217 3-letter uppercase), billing cycle enum, start date, status (ACTIVE, PAUSED, CANCELED), and next_renewal_at date.
- Next renewal date is computed initially and whenever billing cycle or start date changes.
- PAUSED status freezes renewal date computation; RESUME triggers recomputation strictly after current UTC time.
- CANCELED status is terminal; no updates allowed, modifications return 409 Conflict.

### Reminders
- Users may create, list, and delete reminders linked to their subscriptions.
- Reminders support timely user notifications aligned with the subscription state.

### Upcoming Renewals
- The system provides a listing filtered by a configurable time window (default 30 days; between 1 and 365).
- Only ACTIVE subscriptions appear; PAUSED and CANCELED are excluded.
- Results are sorted ascendingly by next renewal date.

## Business Rules and Validation

- All date and time data is stored in UTC; business logic respects Asia/Seoul timezone.
- Vendors' names are unique ignoring case with trimmed input.
- Amounts are validated at the service layer to ensure non-negativity.
- Duplicate vendor or subscription entries result in 409 Conflict.
- CANCELED subscriptions cannot be modified.
- Paused subscriptions freeze next renewal dates, resumed ones recalculate renewal based on the current time.

## Error Handling

- Conflicts (409) for duplicate vendors and subscriptions.
- Bad requests (400) for invalid amounts or currency codes.
- Unauthorized access results in 401 or 403 as appropriate.
- Not found errors return 404.
- Attempts to update canceled subscriptions return 409.

## Performance Requirements

- All requests must respond within 2 seconds typically.
- Queries for upcoming renewals are optimized with sorting and pagination.

## Summary
The Subscription & Renewal Guardian is designed for reliable, user-centric subscription tracking, ensuring precise renewal computation and robust access controls. This document defines the full scope of business rules, error scenarios, and operational characteristics needed by backend developers to ensure accurate and performant system behavior.

This document covers business requirements only. All technical implementation decisions belong to developers. Developers have full autonomy over architecture, APIs, and database design. The document describes WHAT the system should do, not HOW to build it.