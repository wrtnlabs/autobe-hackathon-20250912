# Echo Backend Business Requirements

## 1. Service Overview

### 1.1 Business Justification
Echo addresses a critical need for assistive communication among non-verbal individuals with brain lesions, providing them with AI-powered contextual sentence suggestions and reliable conversation logging to improve their quality of life and independence.

### 1.2 Revenue Strategy
The service anticipates future monetization via subscription offerings for advanced AI features, healthcare collaborations, and potential grants, with an initial focus on accessibility.

### 1.3 Growth Plan
Growth strategies include partnering with healthcare providers, rehabilitation centers, caregivers, and leveraging user feedback to continually improve AI accuracy and service reliability.

### 1.4 Success Metrics
Key metrics include monthly active user growth, AI suggestion adoption rate, conversation frequency, and user retention.

## 2. User Roles and Authentication

### 2.1 User Roles Definition
- Guest: Unauthenticated users with access restricted to signup and login endpoints.
- User: Authenticated users who have permissions to manage their profiles, conversations, favorites, and request AI suggestions.
- Admin: Administrative users authorized to manage user accounts, system settings, and monitor service health.

### 2.2 Authentication Flow
WHEN a user submits signup data with a unique userId and password, THE system SHALL validate the uniqueness and password strength before creating the user account.
WHEN signup data includes survey information, THE system SHALL strictly validate the survey data schema.
WHEN a user logs in, THE system SHALL verify credentials and return a JWT with user role and permissions.
WHEN an authenticated user accesses protected endpoints, THE system SHALL validate the JWT token and enforce role-based access control.

### 2.3 Authorization and Permissions
THE system SHALL enforce role-based access to API functionalities based on the following rules:
- Guests can only access signup and login APIs.
- Users can manage their profile, conversations, favorites, and AI suggestions.
- Admins have full access to all management and monitoring features.

### 2.4 Token Management
THE system SHALL use JWT tokens with a 15-minute expiration for access tokens, and optional refresh tokens with longer life.
THE JWT must include userId, role, and permissions claims.

## 3. Functional Requirements

### 3.1 User Management
WHEN a user signs up, THE system SHALL check for unique userId and validate survey data.
WHEN survey data is submitted or updated, THE system SHALL enforce the fixed schema validation.
WHEN profile data is updated, THE system SHALL persist valid changes.

### 3.2 Conversation Management
WHEN a user initiates conversation, THE system SHALL obtain sunrise and sunset times from KMA API and determine timeOfDay.
THE system SHALL persist conversation context with timestamp, season, and timeOfDay.
THE system SHALL log utterances in ping-pong format with speaker identity and timestamps.
WHEN the conversation ends, THE system SHALL record end time.
WHEN conversation history is requested, THE system SHALL return all past conversations with context metadata.

### 3.3 AI Suggestions
WHEN a user requests suggestions, THE system SHALL retrieve the last two conversations and their utterances.
THE system SHALL format and send context and utterances as a prompt to GPT API.
THE system SHALL return at least three sentence suggestions.

### 3.4 Favorites Management
THE system SHALL allow users to create, retrieve, and delete favorite sentences independent from conversation utterances.
WHEN a favorite is added, THE system SHALL validate sentence length and uniqueness.

## 4. Business Rules and Constraints

### 4.1 Survey Data Validation
THE survey data submitted SHALL strictly follow the fixed JSON schema and be validated accordingly.
IF survey data fails validation, THE system SHALL reject input with detailed errors.

### 4.2 Conversation Context Rules
THE timeOfDay SHALL be set to either "Day" or "Night" based on sunrise/sunset data.
THE context JSON SHALL include ISO 8601 timestamp and season derived from date.

### 4.3 Favorite Sentences Management
Favorite sentences SHALL be stored separately.
Users SHALL not have duplicate favorite sentences.
Sentences SHALL be immutable once saved.

### 4.4 AI Suggestion Constraints
Only the last two complete conversations SHALL be used for suggestions.
API keys SHALL be managed securely and never exposed.
Suggestions SHALL be returned within 3 seconds.

## 5. Error Handling and Recovery

### 5.1 Authentication Errors
IF userId already exists at signup, THEN reject with "UserId already exists" error.
IF login credentials are invalid, THEN reject with HTTP 401 and `AUTH_INVALID_CREDENTIALS` error.
IF JWT tokens are missing or invalid, THEN reject with HTTP 401 Unauthorized.

### 5.2 Data Validation Errors
THE system SHALL reject invalid survey data, utterances, and favorites with clear error messages.

### 5.3 External Service Failures
IF KMA or OpenAI API calls fail, THE system SHALL retry or fallback gracefully while informing the user.

### 5.4 User Recovery Processes
THE system SHALL allow retrying failed operations.
Error messages SHALL guide users towards corrective actions.

## 6. Performance Requirements

THE system SHALL respond to authentication requests within 2 seconds 95% of the time.
Conversation initiation and utterance save SHALL complete within 1 second.
AI suggestions SHALL complete within 3 seconds in normal load.
System SHALL scale to hundreds of concurrent users maintaining low latency.

## 7. External Service Integrations

### 7.1 Weather API Integration
THE system SHALL fetch weather data from Korea Meteorological Administration API.
Sunrise and sunset times SHALL be used to determine timeOfDay.
Failures SHALL be logged and retried.

### 7.2 AI Suggestion API Integration
THE system SHALL call OpenAI GPT API securely to generate suggestions.
Input SHALL be formatted conversational context from last two conversations.
Failures SHALL be communicated clearly to the user.

### 7.3 API Security Considerations
API keys SHALL be held securely.
Rate limiting SHALL be implemented for external API calls.

## 8. Data Lifecycle and Auditing

THE system SHALL log key events related to user accounts, conversations, utterances, and favorites.
Logs SHALL be immutable and stored securely.
User data SHALL be retained for 2 years unless deleted on request.
Audit trails SHALL support queries by user and action.

---

This document defines business requirements only. Technical implementation details, including data structures, API formats, or system architecture, are left to the development team. Developers have full autonomy over how to implement these requirements.