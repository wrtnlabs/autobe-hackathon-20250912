# OAuth Server Functional Requirements and Business Specifications

This document defines the comprehensive business and functional requirements for the OAuth Server backend service. It is intended solely for backend developers to guide the implementation of the system's core features and business logic, excluding technical design details.

---

## 1. Overall Functional Architecture

The OAuth Server acts as a central Authorization Server, responsible for managing user authentication, client authorization, token issuance, and user profile management. It also supports integration with external social login providers and official game APIs for player statistics. Redis-based caching is used to optimize performance and reduce database load.

### 1.1 User Roles

| Role      | Description                                                                                     |
|-----------|------------------------------------------------------------------------------------------------|
| guest     | Unauthenticated users with limited access; can view public info and perform login/registration |
| member    | Authenticated users, including email and social login; manage profiles and use OAuth flows      |
| admin     | System administrators with elevated privileges for management, monitoring, and auditing          |
| developer | API clients or external services integrating via OAuth with client registration and SDK tools    |

### 1.2 Core Components

- Authorization Controller: Handles OAuth authorization code flow and token exchange
- Token Service: Generates, stores, and validates opaque access and refresh tokens
- User Service: Manages user details, authentication (email and social), profile updates
- Client Service: Validates clients, manages redirect URIs and scopes
- Social Login Adapters: Interfaces for Naver, Daum, Apple, Google, and internal OAuth servers
- Game API Clients: Fetch seasonal player statistics using official public APIs
- Cache Layer: Redis used for caching tokens, user info, client info, and external API data

---

## 2. Authorization Code Flow

### 2.1 Flow Description

WHEN a client application initiates an OAuth authorization request via GET /oauth/authorize,
THE system SHALL perform the following steps:

- Verify user login state; if unauthenticated, redirect to login page
- If client is trusted or user has previously consented, skip consent screen
- Otherwise present consent screen with detailed scope descriptions
- Generate an authorization code linked to the user, client, scopes, redirect URI, and expiration
- Store the authorization code securely in database with JSONB payload
- Redirect the user agent to the client's redirect URI with the authorization code appended

### 2.2 Authorization Code Validation

WHEN a client sends POST /oauth/token with an authorization code,
THE system SHALL validate:

- The existence and integrity of the authorization code
- The matching client ID and redirect URI
- Expiration status of the code
- Client authentication credentials

Upon successful validation, THE system SHALL generate and return:

- An opaque access token (unique UUID/CUID/ULID) with expiration and scope info
- An opaque refresh token with expiration
- An OpenID Connect compliant ID token (JWT) including standard claims

---

## 3. Token Issuance and Validation

### 3.1 Token Types

- Access Token: Opaque token used for accessing protected resources
- Refresh Token: Opaque token used to obtain new access tokens
- ID Token: JWT token with standard claims (sub, iss, aud, exp, iat, email, email_verified)

### 3.2 Token Storage and Validation

WHEN tokens are issued,
THE system SHALL store the token identifiers and related metadata in persistent storage,
AND cache validation results in Redis for performance.

WHEN a resource request presents an access token,
THE system SHALL validate token existence, expiration, and scopes,
PERFORM Redis cache lookup first, fallback to database if needed.

---

## 4. User Management

### 4.1 Signup and Login

WHEN a user signs up with email and password,
THE system SHALL store hashed credentials and relevant profile fields.

WHEN a user logs in via email/password or social login,
THE system SHALL match or create user accounts by email to unify identities.

### 4.2 Profile Management

Users SHALL be able to register and update:
- Email (required)
- Password (for local login)
- Optional profile fields stored in a separated profile table (nickname, profile picture)
- External game accounts: Steam PUBG ID, Kakao PUBG ID, League of Legends ID

### 4.3 Social Login Integration

THE system SHALL support login via Naver, Daum, Apple, Google OAuth, and user-provided OAuth servers.

WHEN receiving social login credentials,
THE system SHALL match user email to existing accounts or create new ones,
LINK all social accounts to a single user identity.

---

## 5. Client Management

THE system SHALL provide functionality for:

- Client registration with fields: client_id, client_secret, redirect URIs, is_trusted flag
- Validation of redirect URI and requested scopes during OAuth flows
- Soft deletion support with deletedAt timestamp
- Management of client profile fields with high modification frequency separated

---

## 6. Social Login Integration

THE system SHALL:

- Allow external OAuth providers to be registered and managed
- Support token and userinfo retrieval from providers
- Cache external providers' user data in Redis
- Support internal OAuth servers acting as external providers

---

## 7. Error Handling and Edge Cases

- WHEN invalid OAuth parameters are detected,
THE system SHALL respond with detailed Korean language error messages and recommended mitigation steps.

- WHEN access tokens expire or are invalid,
THE system SHALL return appropriate HTTP status codes and user-friendly guidance.

- Rate limiting SHALL be enforced per IP and client ID to prevent abuse.

- Audit logs SHALL record critical authentication and client operations.

---

## 8. External Integrations and Caching

### 8.1 Redis Caching

THE system SHALL employ Redis caching for:

- Access and refresh token validation
- User profile data retrieval
- Client data lookup
- External API responses for game statistics

THE cache SHALL respect TTLs appropriate for each data type and support fallback on cache miss.

### 8.2 Official Game APIs

THE system SHALL fetch seasonal player statistics from official PUBG and Riot Games APIs,
CACHE results in Redis to reduce API calls and improve response times.

---

## 9. Success Criteria and Performance Expectations

- OAuth flows SHALL complete with token issuance under 100ms in the majority of cases.
- The system SHALL handle at least 100 simultaneous OAuth authorization and token issuance requests.
- Error messages SHALL be localized in Korean and include actionable recovery advice.
- Developers SHALL be able to integrate clients within 5 minutes using environment variables only.

---

> This document provides business requirements only. All technical implementation decisions belong to developers. Developers have full autonomy over architecture, APIs, and database design. The document describes WHAT the system should do, not HOW to build it.
