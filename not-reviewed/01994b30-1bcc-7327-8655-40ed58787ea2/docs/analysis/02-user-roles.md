# CREVERSE AI Essay Auto-Grading - User Roles, Authentication and Authorization Requirements

## 1. Introduction
This document provides a detailed business requirements specification for the user roles, authentication mechanisms, authorization rules, and permission structures within the CREVERSE AI Essay Auto-Grading platform. The primary audience is backend developers who will implement the authentication and authorization components of the system. This document ensures all relevant roles, permissions, token management policies, and security requirements are clearly defined to eliminate ambiguity.

## 2. Business Model Summary
CREVERSE AI Essay Auto-Grading is an enterprise-grade platform designed for multi-tenant educational organizations to evaluate essays at scale. The platform supports multiple user roles spanning students, teachers, analysts, and administrators with defined operational boundaries. Efficient and secure authentication and authorization mechanisms are critical to protect data isolation in a multi-tenant environment while enabling role-specific access to platform capabilities.

## 3. User Roles and Authentication

### 3.1 Authentication Flow Requirements
The system SHALL implement robust authentication flows with the following requirements:

- THE system SHALL allow users to register using email/password credentials.
- WHEN a user submits login credentials (via OIDC or email/password), THE system SHALL validate the credentials and, upon success, issue a JWT containing scoped tenant claims.
- THE system SHALL provide endpoints for user logout, immediately invalidating active sessions.
- THE system SHALL maintain secure user sessions with access tokens and refresh tokens.
- THE system SHALL require users to verify their email addresses before allowing sensitive operations.
- THE system SHALL allow users to request password resets via secure tokenized email flows.
- THE system SHALL enforce rate limits on authentication attempts to mitigate brute force attacks.
- THE system SHALL return specific error responses for invalid credentials, expired tokens, or unauthorized access attempts.

### 3.2 User Role Definitions
The following roles SHALL be supported within the platform, each with specific permissions detailed in Section 3.3:

- **Guest**: Unauthenticated or minimal permission users who can only access public endpoints or login pages.
- **Student**: End-users who submit essays, view individual grading feedback, and access their own reports.
- **Teacher**: Educators who create/manage rubric templates and versions, assign essays for grading, analyze results, and oversee plagiarism scans.
- **Analyst**: Users focused on operational insight with read-only access to detailed analytics, costs, and audit logs.
- **Admin**: System administrators with full control over tenants, API keys, feature management, audit reviews, and system health.

### 3.3 Role Permissions and Restrictions
For each role, the system SHALL enforce the following permissions and restrictions:

- **Guest**:
  - CAN access login and public API endpoints.
  - CANNOT submit essays or view any user-specific data.

- **Student**:
  - CAN submit essays (upload, text input, OCR).
  - CAN view only their own grading results and plagiarism scan outcomes.
  - CANNOT access or modify rubrics or analytic reports.

- **Teacher**:
  - CAN create, edit, validate, publish, and deprecate rubric templates and versions.
  - CAN assign essays for grading and cancel grading jobs.
  - CAN view plagiarism scan results for submissions within their classes.
  - CAN access reports by classes and students under their purview.
  - CANNOT manage tenants, API keys, or global system settings.

- **Analyst**:
  - CAN access analytic reports, cost governance data, and audit logs in read-only mode.
  - CANNOT create or modify essays, rubrics, or grading jobs.
  - CANNOT manage tenants or users.

- **Admin**:
  - CAN manage tenants, schools, classes, and users.
  - CAN create/revoke API keys with customizable scopes and quotas.
  - CAN manage feature flags, health endpoints, webhooks, and system-wide audit logs.
  - CAN perform subject access and deletion requests in compliance with GDPR-like regulations.

## 4. Permission Matrix

| Action / Resource               | Guest | Student | Teacher | Analyst | Admin |
|--------------------------------|-------|---------|---------|---------|-------|
| Login / Logout                 | ✅    | ✅      | ✅      | ✅      | ✅    |
| Submit Essay                  | ❌    | ✅      | ❌      | ❌      | ❌    |
| View Own Grades               | ❌    | ✅      | ❌      | ❌      | ❌    |
| Create/Edit Rubric Templates  | ❌    | ❌      | ✅      | ❌      | ❌    |
| Publish/Deprecate Rubrics     | ❌    | ❌      | ✅      | ❌      | ❌    |
| Manage Grading Jobs           | ❌    | ❌      | ✅      | ❌      | ❌    |
| View Plagiarism Scans         | ❌    | ✅ (own)| ✅      | ❌      | ❌    |
| Access Reports (Class/School) | ❌    | ❌      | ✅      | ✅      | ❌    |
| Access Analytics & Costs      | ❌    | ❌      | ❌      | ✅      | ❌    |
| Manage Tenants & API Keys     | ❌    | ❌      | ❌      | ❌      | ✅    |
| Manage System Config & Admin  | ❌    | ❌      | ❌      | ❌      | ✅    |
| Perform Audit Log Reviews     | ❌    | ❌      | ❌      | ✅      | ✅    |

## 5. Token Management Strategy

- THE system SHALL use JWTs for authentication tokens.
- The JWT payload SHALL include user's unique ID, tenant ID, assigned roles, and scope of permissions.
- Access tokens SHALL have a lifespan of 15-30 minutes to minimize risk.
- Refresh tokens SHALL have a lifespan of 7-30 days to enable session continuity.
- THE system SHALL provide secure token revocation mechanisms.
- Tokens SHALL be securely stored; access tokens in memory or httpOnly cookies, refresh tokens in httpOnly cookies.
- THE system SHALL enforce token expiration and refresh policies.
- THE system SHALL validate token scopes on every request.

## 6. Security and Compliance Considerations

- THE system SHALL enforce tenant isolation via scoped JWT claims and PostgreSQL Row Level Security policies.
- THE system SHALL apply rate limits for authentication and authorization endpoints per user and per API key.
- THE system SHALL log authentication and authorization events for audit.
- THE system SHALL support GDPR-like user data access and deletion workflows mediated by admins.

## 7. Performance and Scalability Expectations

- Authentication endpoints SHALL respond within 2 seconds under normal load.
- Authorization validation SHALL be optimized to not exceed 100 milliseconds per request.

## 8. Error Handling Requirements

- IF authentication credentials are invalid, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS.
- IF token is expired, THEN THE system SHALL return HTTP 401 Unauthorized with error code AUTH_TOKEN_EXPIRED.
- IF access is forbidden due to insufficient permissions, THEN THE system SHALL return HTTP 403 Forbidden with error code AUTH_FORBIDDEN.
- IF rate limits are exceeded, THEN THE system SHALL return HTTP 429 Too Many Requests with Retry-After header.

## 9. Appendix: Related Documentation

- For detailed functional capabilities related to users and roles, refer to [Functional Requirements Documentation](./03-functional-requirements.md).
- For security policies and compliance details, refer to [Security and Compliance Guide](./04-security-compliance.md).
- For external integrations related to authentication and authorization, refer to [External Integrations Documentation](./05-external-integrations.md).



> This document provides **business requirements only** regarding user roles, authentication, and authorization within the CREVERSE AI Essay Auto-Grading platform. All technical implementation decisions regarding architecture, APIs, and database design belong solely to the development team. This document defines WHAT the system must do to meet business goals and security requirements, not HOW to implement these features.