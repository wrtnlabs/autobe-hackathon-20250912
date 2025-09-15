# Specialty Coffee Log - User Roles and Authentication Requirements

## 1. Introduction

This document defines the user roles and authentication requirements for the Specialty Coffee Log service. It is intended to deliver clear, comprehensive business-level specifications to backend developers so they can implement the authentication and authorization logic correctly and securely.

The Specialty Coffee Log service allows users (members) to sign up, log in, manage their profiles, view and search cafes, add new cafes, and create private coffee experience logs. Guest users can browse cafe information but must authenticate to create or manage personal data.

## 2. User Role Definitions

The system has the following user roles with defined permissions:

| Role   | Description                                                                                     | Permissions Summary                                                          |
|--------|-------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| Guest  | Unauthenticated users who can browse public information like the list of cafes.                 | Can view cafe lists and search cafes by name only. Cannot create or edit any data. |
| Member | Authenticated users who can manage their account and personal coffee logs, and suggest new cafes.| Can sign up, log in, update profile, add/edit/delete own coffee logs, add new cafes, suggest edits. Logs are private and visible only to the member. |

### Detailed Role Permissions

#### Guest
- Can browse the list of all registered cafes.
- Can search cafes by name.
- Cannot create, update, or delete any coffee logs or cafe information.
- Cannot access or modify user profile data.

#### Member
- Can sign up using an email and password.
- Can log in with email and password.
- Can update own profile information including email and password.
- Can create coffee logs tied to specific cafes.
- Can update or delete only their own coffee logs.
- Can view a private "My Page" that displays all their coffee logs.
- Can add new cafes and suggest edits to existing cafes. These user actions may trigger review.
- Cannot see other users' coffee logs.

## 3. Authentication Flow Requirements

### Core Authentication Functions

- THE system SHALL allow users to register an account using a valid email address and a password.
- WHEN a user registers, THE system SHALL send an email verification link to the user's email address.
- THE system SHALL allow users to log in with their verified email and password.
- WHEN a user submits login credentials, THE system SHALL validate credentials and respond within 2 seconds.
- THE system SHALL allow logged-in users to log out, ending their session.
- THE system SHALL maintain user sessions securely to allow authenticated access.
- THE system SHALL allow users to reset forgotten passwords via email.
- THE system SHALL allow users to change their password after logging in.
- THE system SHALL enforce account lockout after 5 consecutive failed login attempts for 30 minutes to prevent brute force attacks.
- THE system SHALL allow users to update their own profile information including email and password.
- THE system SHALL store passwords securely using strong hashing algorithms.

### Email Verification

- WHEN a new user registers, THE system SHALL mark the account as unverified until email is confirmed.
- IF a user attempts to log in without having verified their email, THEN THE system SHALL deny access and provide a clear error message.

### Session Management

- THE system SHALL generate a JWT access token with an expiration of 30 minutes upon successful login.
- THE system SHALL generate a refresh token valid for 14 days.
- THE system SHALL allow refreshing access tokens using a valid refresh token.
- THE system SHALL revoke refresh tokens upon user logout or password change.

## 4. Role-based Permission Matrix

| Action                               | Guest | Member |
|------------------------------------|-------|--------|
| View list of cafes                 | ✅    | ✅     |
| Search cafes by name               | ✅    | ✅     |
| Create new user account            | ❌    | ✅     |
| Log in                           | ❌    | ✅     |
| Log out                          | ❌    | ✅     |
| Update own profile                | ❌    | ✅     |
| Create coffee logs                | ❌    | ✅     |
| Update own coffee logs           | ❌    | ✅     |
| Delete own coffee logs           | ❌    | ✅     |
| View own coffee logs (My Page)    | ❌    | ✅     |
| Add new cafes                    | ❌    | ✅     |
| Suggest edits to existing cafes   | ❌    | ✅     |
| View other users' logs          | ❌    | ❌     |

## 5. Token Management

- THE system SHALL use JSON Web Tokens (JWT) for authentication tokens.
- THE JWT access token SHALL include the user ID and role information.
- THE access token expiration time SHALL be 30 minutes.
- THE refresh token expiration time SHALL be 14 days.
- THE system SHALL store tokens securely and limit token reuse.
- THE system SHALL invalidate all tokens on password change or logout.
- THE system SHALL use secure HTTP-only cookies or local storage with secure flags for token storage, subject to security review.

## 6. Access Control Policies

- THE system SHALL enforce that users can only access their own coffee logs.
- THE system SHALL deny any attempt from a member to access or modify another user's logs.
- THE system SHALL grant read-only access to the cafe list and cafe details to all users including guests.
- THE system SHALL allow only authenticated members to add or suggest edits to cafe information.
- THE system SHALL validate user permissions on every protected operation.

## 7. Summary

This specification defines clear user roles, comprehensive authentication flows, token handling, and precise access control policies ensuring user privacy and security for the Specialty Coffee Log service backend. Backend developers must implement these business rules exactly to deliver the intended functionality and secure user experience.

---

This document provides business requirements only. All technical implementation decisions belong to developers, including architecture, API design, and database modeling. Developers have full autonomy to choose technologies and implementation details. This document describes WHAT the system must do, NOT HOW to build it.
