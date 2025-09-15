# Requirements Analysis of Subscription & Renewal Guardian Backend

## 1. Introduction

Subscription & Renewal Guardian is a backend service designed to help users track their personal subscriptions and upcoming renewals with various vendors. This document details the comprehensive requirements for the backend system, focusing on business logic, domain entities, user roles, and system behaviors needed to meet functional and non-functional goals.

## 2. Business Model

### Why This Service Exists

The service addresses the common problem of managing multiple subscription services, each with distinct billing cycles, amounts, and renewal dates. Users often miss renewal notifications leading to unexpected charges or lapses in service. Competitors include subscription management apps that often lack flexibility or transparent console experience.

### Core Value Proposition

Enables users to centrally track subscriptions, receive reminders, and manage subscription statuses with minimal overhead.

### Business Strategy

Although payments and notifications are out of scope, the platform could monetize via premium features or ads in future phases. The initial focus is on reliable, simple subscription tracking with accurate renewal predictions.

## 3. User Roles and Permissions

### Roles

- **User**: Standard authenticated user who can manage only their own subscriptions, vendors, and reminders.
- **Admin**: Read-only access to all user records and their subscriptions, but cannot modify.
- **Guest**: Unauthenticated users who can register and login.

### Permissions

- Users can create, read, update, delete their own subscriptions, vendors, and reminder settings.
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

## 5. Authentication and Authorization

### Flow

- Users can signup with email and password
- Users can login with credentials to receive JWT
- JWT tokens include userId and role
- No refresh tokens required

### Authorization Principles

- Users can only access and modify their own data
- Admins have read-only access to all users’ data

## 6. JWT Token Specification

- JWT payload SHALL include userId and role claims
- Token expiration time SHALL be configurable

## 7. Permissions Matrix

| Action                        | User | Admin | Guest |
|------------------------------|------|-------|-------|
| Signup                       | ❌   | ❌    | ✅    |
| Login                        | ❌   | ❌    | ✅    |
| Create Vendor                | ✅   | ❌    | ❌    |
| Create Subscription          | ✅   | ❌    | ❌    |
| Modify Own Subscription      | ✅   | ❌    | ❌    |
| Cancel Own Subscription      | ✅   | ❌    | ❌    |
| Pause/Resume Own Subscription| ✅   | ❌    | ❌    |
| List All Users’ Data         | ❌   | ✅    | ❌    |
| Modify Others’ Data          | ❌   | ❌    | ❌    |

## 8. Summary

This document clearly conveys the business requirements and constraints for the Subscription & Renewal Guardian backend user roles and authentication system. It provides backend developers with an unambiguous framework for implementing authentication, role management, and authorization controls.

---

> This document provides business requirements only. All technical implementation decisions belong to developers. Developers have full autonomy over architecture, APIs, and database design. The document describes WHAT the system should do, not HOW to build it.