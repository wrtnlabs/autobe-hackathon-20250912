# Subscription & Renewal Guardian - Requirements Analysis Report

## 1. Introduction

### 1.1 Project Overview
Subscription & Renewal Guardian is a backend service designed to help users track their personal subscriptions and upcoming renewal dates effectively. The system manages subscriptions to various vendors like Netflix or Spotify, providing users with renewal reminders and status management capabilities. The service stores all data securely in PostgreSQL and is accessed via a RESTful API built with NestJS and Prisma.

### 1.2 Business Justification

#### Why This Service Exists
Modern users often juggle multiple subscription services, making it challenging to track billing cycles and renewal dates leading to unwanted charges or missed cancellation windows. This service addresses this pain point by centralizing subscription data and proactively tracking renewals to empower users with better control.

#### Revenue Strategy
Although initially offered free of charge, this service can be monetized later through premium features such as advanced reporting, multi-device synchronization, or vendor partnerships.

#### Growth Plan
User acquisition will focus on organic growth through social sharing and integrations, with retention enhanced via timely renewal reminders and user-friendly management features.

#### Success Metrics
Key success metrics include monthly active users (MAU), user retention rates, number of active subscriptions per user, and the accuracy and punctuality of renewal reminders.

## 2. User Roles and Permissions

The system will support two main user roles:

- **User**: Authenticated standard user who can manage only their own subscription data, including creating, updating, pausing, resuming, and canceling their subscriptions.
- **Admin**: Read-only role with the ability to list and view all users' subscription records but not modify any data.

### Authorization Rules
- Users can only access and manipulate their own data.
- Admins have read-only access to all users' records.
- Guests can only access authentication endpoints (signup/login).

## 3. Core Entities and Domain Model

The domain contains the following core entities:

- **User**: Represents an individual user with authentication credentials.

- **Vendor**: Represents subscription providers (e.g., Netflix, Spotify), identified uniquely by their name.

- **Subscription**: Tracks individual subscriptions with attributes:
  - id: Unique identifier.
  - user_id: Reference to owner user.
  - vendor_id: Reference to vendor.
  - plan_name: Name of the subscription plan.
  - billing_cycle: One of MONTHLY, YEARLY, WEEKLY, DAILY.
  - amount: Monetary amount, >= 0.
  - currency: 3-letter ISO currency code.
  - started_at: Subscription start date/time in UTC.
  - next_renewal_at: Next renewal datetime, auto-calculated and stored.
  - status: ACTIVE, PAUSED, or CANCELED.
  - notes: Optional user notes.

- **ReminderSetting**: Settings for renewal reminders:
  - subscription_id: Linked subscription.
  - days_before: 7, 3, or 1.
  - channel: EMAIL or NONE.

Unique constraints:
- Vendor name is unique.
- Each subscription is unique on (user_id, vendor_id, plan_name).
- Reminder settings are unique per (subscription_id, days_before).

## 4. Functional Requirements

### 4.1 Authentication
- The system SHALL support user signup with email and password.
- The system SHALL allow users to login and obtain a JWT token.
- JWT tokens are minimal with payload containing userId and role.
- No refresh token mechanism is required.

### 4.2 Vendor Management
- Users SHALL be able to create vendors with unique names.
- Vendors cannot be deleted once created (scope simplification).

### 4.3 Subscription Management
- Users SHALL be able to create subscriptions linking to vendors and plans.
- When a subscription is created or updated, if next_renewal_at is missing or billing_cycle, started_at, or status changes, the system SHALL recalculate next_renewal_at as the earliest date beyond now by advancing started_at by multiples of the billing cycle.
- Users SHALL be able to pause and resume subscriptions between ACTIVE and PAUSED states.
- Users SHALL be able to cancel subscriptions, which becomes a terminal state allowing only read access.
- The system SHALL prevent any modification or status transitions other than read on CANCELED subscriptions.
- The system SHALL prevent duplicate subscriptions per (user_id, vendor_id, plan_name).

### 4.4 Reminder Settings
- Users SHALL be able to add multiple reminder settings per subscription.
- Reminder settings are unique per (subscription_id, days_before).
- Each reminder setting SHALL have a defined channel (EMAIL or NONE).

### 4.5 Renewal Tracking and Notifications
- THE system SHALL provide listings of upcoming renewals for the user within a default window of 30 days.
- The listing SHALL exclude subscriptions in PAUSED or CANCELED state.
- Results SHALL be sorted ascending by next_renewal_at.
- Actual sending of notifications or emails is out of this system scope.

## 5. Non-Functional Requirements

- Pagination: List endpoints SHALL support limit/offset style pagination.
- DTO Validation: All input data SHALL be validated with strict types and constraints.
- Error Model: Errors SHALL be consistent with clear, actionable messages for invalid operations.
- Timezone: All dates are stored in UTC but presented in Asia/Seoul timezone context if applicable.
- Performance: The system SHALL respond to authentication and CRUD operations within 2 seconds under nominal load.

## 6. Business Rules and Constraints

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

## 7. Summary

This report defines clear and actionable business requirements for the Subscription & Renewal Guardian backend service. It lays out the foundation of user roles, core entities, key functional capabilities, and constraints that backend engineers will follow when implementing the system. Subsequent documentation will expand on detailed user roles, API behavior, error handling, and testing.

---

> This document defines business requirements only. All technical implementation decisions (architecture, APIs, database design, etc.) belong to the development team. It describes what the system must do, not how to build it.