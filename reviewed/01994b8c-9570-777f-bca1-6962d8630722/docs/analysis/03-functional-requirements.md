# Functional Requirements for Subscription & Renewal Guardian

This document provides comprehensive business requirements and functional specifications for the Subscription & Renewal Guardian backend service. It is written for backend developers and technical stakeholders who will implement the system's core business logic and workflows.

This document strictly defines WHAT the system should do, focusing on business rules, workflows, validations, and expected behavior. All technical implementation details (architecture, APIs, database design) are at the developer's discretion.

---

## 1. Introduction and Scope

This service helps users track their personal subscriptions, monitor upcoming renewal dates, and manage reminders. It supports two user roles: standard users and read-only administrators.

The core functionality includes managing user subscriptions with associated vendors, billing cycles, renewal dates, and reminder settings.

Non-functional aspects such as pagination, DTO validation, and consistent error models are integral parts of the system.

Timezone handling follows Asia/Seoul; all dates are stored as ISO8601 UTC timestamps.


## 2. Business Model

### Why This Service Exists

Many users struggle to keep track of multiple subscription services and their renewal dates, leading to unintended renewals or lapses in service. This service fills that gap by providing centralized, personal subscription tracking with automatic renewal date calculation and customizable reminders.

### Revenue Strategy

Currently, the service is designed as a personal productivity tool with potential future revenue models including premium features or advertising.

### Growth Plan

Growth strategies include user acquisition through organic marketing and partnerships with subscription vendors.

### Success Metrics

- Number of active users managing subscriptions
- Accuracy of renewal tracking
- User engagement with reminders


## 3. User Roles and Authentication

### Roles

- **user**: Authenticated end-user who can manage only their own subscriptions, vendors, and reminders.
- **admin**: Read-only user who can list and view details of all users and their data but cannot modify.

### Authentication

- Email and password based JWT authentication.
- Signup and login endpoints.
- No refresh tokens; tokens expire after a short duration.

### Permissions

- Users can only create, modify, and delete their own subscriptions and reminder settings.
- Admins can list and view details of all users’ data but cannot create or modify.
- Subscription actions:
  - User can activate, pause, or cancel subscriptions with defined status transitions.
  - Cancelled subscriptions are terminal and read-only.

## 4. Core Entities and Data Management

### User
- Identified by unique user ID
- Authenticated via JWT with email and password

### Vendor
- Unique by name
- Vendors represent service providers like Netflix or Spotify

### Subscription
- Attributes:
  - id
  - user_id (owner reference)
  - vendor_id
  - plan_name (unique per user-vendor)
  - billing_cycle (enum: MONTHLY, YEARLY, WEEKLY, DAILY)
  - amount (non-negative number)
  - currency (3-letter ISO code string)
  - started_at (ISO8601 UTC datetime)
  - next_renewal_at (ISO8601 UTC datetime, auto-calculated)
  - status (enum: ACTIVE, PAUSED, CANCELED)
  - notes (optional string)

- Uniqueness on (user_id, vendor_id, plan_name)

### Reminder Setting
- Attributes:
  - subscription_id
  - days_before (enum: 7, 3, 1)
  - channel (enum: EMAIL, NONE)

- Unique constraint on (subscription_id, days_before)
- Multiple reminder settings per subscription allowed

## 5. Subscription Management

### Creation

WHEN a user creates a subscription, THE system SHALL:
- Validate all input fields according to DTO validation rules.
- Enforce that user_id matches the logged-in user.
- Check uniqueness on (user_id, vendor_id, plan_name).
- Auto-calculate next_renewal_at by advancing from started_at by billing_cycle increments until strictly greater than current UTC time.
- Set status to ACTIVE by default unless provided.

### Updates

WHEN a user updates a subscription, THE system SHALL:
- Permit only status ACTIVE or PAUSED updates; prohibit modifying CANCELED subscriptions except read.
- Recalculate next_renewal_at if billing_cycle, started_at, or status changes.

### Status transitions

- ACTIVE ↔ PAUSED transitions are allowed.
- CANCELED is terminal; no transitions away from CANCELED allowed.

### Listing

WHEN listing subscriptions, THE system SHALL:
- Filter results to the authenticated user only for user role.
- Support pagination with limit and offset.
- Sort by next_renewal_at ascending when listing upcoming renewals.
- Exclude subscriptions with status PAUSED or CANCELED from upcoming renewals.

## 6. Vendor Management

- Vendors have unique names.
- Users can create and manage vendors.
- Admins can view all vendors but cannot create or modify.

## 7. Reminder Settings Management

- Users can create multiple reminder settings per subscription.
- Each reminder has days_before enum (7|3|1) and channel enum (EMAIL|NONE).
- Unique constraint on (subscription_id, days_before).
- Reminder is only triggered if channel is EMAIL.

## 8. Renewal Tracking and Notifications

- next_renewal_at is persisted and kept up-to-date through create and update flows.
- Only ACTIVE subscriptions are considered for renewal tracking.
- Upcoming renewals list filters by next_renewal_at within the next 30 days by default.

## 9. Error Handling and Validation

- Input validations with clear messages for DTOs.
- Errors return consistent error models stating code and descriptive messages.
- Unauthorized access attempts return HTTP 401 Unauthorized.
- Forbidden operations (e.g., modifying CANCELED subscriptions) return HTTP 403 Forbidden.
- Duplicate record attempts return HTTP 409 Conflict.

## 10. Performance Requirements

- Pagination implemented with limit and offset parameters.
- Response times for API calls should be under 2 seconds.
- Consistent error responses to allow smooth client handling.

## 11. Business Rules

- Currency codes SHALL be ISO 4217 3-letter uppercase strings.
- Amounts SHALL be greater than or equal to zero.
- Vendor names MUST be unique and case-insensitive.
- Subscription status transitions MUST follow:
  - ACTIVE <-> PAUSED transitions allowed.
  - CANCELED status is terminal; no reversal allowed.
  - No actions (other than read) allowed on CANCELED subscriptions.
- next_renewal_at calculation:
  - Advancement from started_at by billing_cycle units until strictly greater than current UTC timestamp.
  - Recalculated on create and update events affecting billing_cycle, started_at, or status.
- Reminder settings uniqueness ensured on (subscription_id, days_before).
- Subscriptions uniquely identified by (user_id, vendor_id, plan_name).

## 12. Summary

This report defines clear and actionable business requirements for the Subscription & Renewal Guardian backend service. It lays out the foundation of user roles, core entities, key functional capabilities, and constraints that backend engineers will follow when implementing the system. Subsequent documentation will expand on detailed user roles, API behavior, error handling, and testing.

---

> This document defines business requirements only. All technical implementation decisions (architecture, APIs, database design, etc.) belong to the development team. It describes what the system must do, not how to build it.
