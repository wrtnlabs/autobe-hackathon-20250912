# Requirement Analysis Report for Subscription & Renewal Guardian Service

## 1. Introduction

This document presents a comprehensive analysis of the business requirements for the Subscription & Renewal Guardian service. The purpose is to provide a clear, detailed foundation for backend developers to implement the system that manages personal subscription tracking and renewal reminders effectively.

The service aims to help users monitor their various subscriptions and upcoming renewals, reducing missed payments and ensuring better subscription management.

## 2. Business Model

### Why This Service Exists

The Subscription & Renewal Guardian service addresses the widespread problem of users losing track of their numerous personal subscriptions due to a fragmented and manual management process. Many users face unexpected charges when subscriptions auto-renew without their awareness, leading to dissatisfaction and potential financial issues.

This service fills a niche by providing a centralized, easy-to-use platform for tracking subscriptions and notifying users of upcoming renewals. This reduces subscription fatigue and increases user control over their recurring expenses.

### Revenue Strategy

Although the current system focuses on personal use without direct monetization, possible revenue strategies include offering premium features such as enhanced analytics, multiple user profiles, or integration with payment systems. The initial emphasis is on user acquisition and retention through reliable, accurate subscription tracking.

### Growth Plan

User acquisition will rely on the value of subscription management and potential integrations with other personal finance tools. Retention will be driven by timely, accurate reminders and an intuitive platform that encourages continued use.

### Success Metrics

- Monthly Active Users (MAU)
- Subscription count per user
- Renewal reminder accuracy
- User retention rate over 6 and 12 months

## 3. User Roles and Permissions

The service defines two user roles with distinct access levels:

### User
- Authenticated individual users who can create, read, update, and delete their own vendors and subscriptions. Allowed to manage their personal data and track renewals.

### Admin
- System administrators with read-only global oversight. They can view all user data but cannot modify any user or subscription information.

Permissions Summary:
| Action                        | User | Admin |
|-------------------------------|:----:|:-----:|
| Create subscription/vendor     |  ✅  |   ❌  |
| Read own subscriptions/vendors |  ✅  |   ❌  |
| Read all subscriptions/vendors |  ❌  |   ✅  |
| Update own subscriptions/vendors | ✅  |   ❌  |
| Delete own subscriptions/vendors | ✅  |   ❌  |
| Modify any subscription status  | ✅  |   ❌  |

Authentication is based on JWT tokens issued on successful email and password login.
No refresh tokens are implemented; tokens have fixed expirations.
User credentials must be verified on signup and login with appropriate validation.

## 4. Functional Requirements

### Vendor Management
- Users can create new vendor records with unique vendor names (case-insensitive, trimmed).
- Vendor names must be unique across the system using case-insensitive (citext) comparison.
- Users can update vendor details but cannot delete vendors.
- System should prevent duplicate vendors and return a 409 conflict error if a duplicate is attempted.

### Subscription Management
- Users can add subscriptions linked to vendors with fields including plan name, amount (decimal >=0), currency code (ISO-4217 uppercase), billing cycle (enum set), start date, status, and next renewal date.
- Subscriptions are unique per (user_id, vendor_id, plan_name).
- System computes and persists next renewal date on creation and updates when billing cycle or start date changes.
- Status can be ACTIVE, PAUSED, or CANCELED. PAUSED freezes renewal computations; RESUME must recalculate the next renewal date to be strictly in the future.
- Users can update subscription details unless status is CANCELED (terminal state). Attempts to modify canceled subscriptions must return a 409 error.

### Reminders
- Users can create and manage reminders tied to their subscriptions.
- Reminders help notify users prior to renewals but should align with subscription states.

### Upcoming Renewals
- System provides an endpoint to query subscriptions renewing within a configurable number of days (default 30, range 1 to 365).
- Only ACTIVE subscriptions are included; PAUSED and CANCELED subscriptions are excluded.
- Results are sorted ascending by the next renewal date.

## 5. Business Rules and Validation

- All date-time fields are stored as UTC; business logic uses timezone Asia/Seoul.
- Vendor names are trimmed on input and enforced unique case-insensitively.
- Amounts in subscriptions must be non-negative decimals, validated at the service layer.
- Attempts to create duplicates at vendor or subscription level cause a 409 conflict error.
- Status transitions from CANCELED are forbidden; modifications return 409 conflict.
- Pausing a subscription freezes next renewal date; resuming recalculates the next renewal date until strictly > now.

## 6. Error Handling Scenarios

- Duplicate vendor creation attempts return HTTP 409 with an appropriate message.
- Duplicate subscription creation attempts return HTTP 409.
- Invalid amounts or currency codes result in HTTP 400 Bad Request with error details.
- Unauthorized access to another user's data results in HTTP 403 Forbidden.
- Attempts to modify canceled subscription entries respond with 409 Conflict.
- Missing or invalid JWT tokens result in HTTP 401 Unauthorized.

## 7. Performance Expectations

- All user-facing API responses shall complete within 2 seconds under standard load.
- Queries for upcoming renewals return paginated results sorted by renewal date.
- Data consistency on creation and update operations shall be ensured through transactional integrity.

## 8. Summary

This analysis comprehensively captures the Subscription & Renewal Guardian's functional and business requirements, clarifies user roles, and enumerates validation and error handling rules. It lays a solid foundation for the subsequent detailed design, schema development, API specification, testing, and implementation phases.

---

This document provides business requirements only. All technical implementation decisions belong to developers. Developers have full autonomy over architecture, APIs, and database design. The document describes WHAT the system should do, not HOW to build it.