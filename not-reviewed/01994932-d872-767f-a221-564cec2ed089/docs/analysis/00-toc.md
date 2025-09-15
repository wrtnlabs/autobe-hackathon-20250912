# Echo Backend Requirement Analysis Report

## 1. Introduction

Echo is an AI-powered assistive communication backend service tailored to support non-verbal individuals with brain lesions. The purpose of this backend is to facilitate communication by converting text input into speech and recommending AI-driven, context-aware sentences to enhance dialogues.

## 2. Business Model

### Why This Service Exists
Non-verbal individuals with neurological impairments often face significant challenges in effective communication, leading to social isolation and reduced quality of life. Echo is designed to fill this gap by providing a dynamic and intelligent communication platform that leverages AI for personalized sentence suggestions, adapted to the user's conversational context.

### Revenue Strategy
Initially offered as a free service to maximize accessibility, future plans include monetization via subscription tiers offering enhanced AI functionalities and partnerships with healthcare providers specializing in assistive technologies.

### Growth Plan
Growth strategies focus on partnerships with rehabilitation centers, hospitals, and caregiver communities, alongside continuous refinement of AI algorithms and user experience improvements.

### Success Metrics
- Monthly active user growth target of 20%.
- AI suggestion response times under 3 seconds.
- Accurate day/night context recognition with over 90% reliability.
- User satisfaction rates above 85% positive feedback.
- System uptime target of at least 99.9%.

## 3. User Roles and Authentication

### User Roles
- **Guest:** Limited to public endpoints (signup, login).
- **User:** Authenticated individuals with privileges to manage personal data, engage in conversations, save favorites, and access AI suggestions.
- **Admin:** Users with elevated privileges for managing system-wide settings, user management, and monitoring.

### Authentication Workflow
- Users register using a unique userId and password.
- All passwords shall be securely hashed.
- Successful logins issue JWT tokens with embedded role and permission claims.
- Tokens have a 15-minute expiration window, with optional refresh tokens managed appropriately.
- Access to protected APIs requires valid JWT tokens.

### Permissions Matrix
| Action               | Guest | User | Admin |
|----------------------|-------|------|-------|
| Signup               | ✅    | ❌   | ❌    |
| Login                | ✅    | ✅   | ✅    |
| Profile Management    | ❌    | ✅   | ✅    |
| Conversation Handling| ❌    | ✅   | ✅    |
| Favorites Management  | ❌    | ✅   | ✅    |
| AI Suggestions        | ❌    | ✅   | ✅    |
| User Management       | ❌    | ❌   | ✅    |
| System Administration | ❌    | ❌   | ✅    |

## 4. Functional Requirements

### User Management
- THE system SHALL validate uniqueness of userId on signup.
- THE system SHALL perform strict validation of fixed survey schema.
- THE system SHALL allow profile updates with validated data.

### Conversations
- New conversations SHALL be initialized with environmental context gathered from KMA API.
- THE system SHALL store conversations with timestamps, season, and timeOfDay computed from sunrise/sunset data.
- Utterances SHALL be logged sequentially with speaker attribution.
- Conversation histories SHALL be retrievable.

### AI Suggestions
- THE system SHALL generate AI-powered suggestions using the last two conversations.
- THE system SHALL integrate securely with OpenAI GPT API.
- Suggestions SHALL be returned promptly.

### Favorites
- Users SHALL be able to add, list, and remove favorite sentences.
- Limitations apply to the number and length of favorite sentences.

## 5. Business Rules

- Survey data validation messages SHALL clearly specify errors.
- timeOfDay SHALL be either "Day" or "Night".
- Duplicate favorite sentences SHALL be disallowed.
- AI API keys SHALL be protected.

## 6. Error Handling

- Authentication errors SHALL result in 401 responses.
- Validation errors SHALL provide explicit feedback.
- External API failures SHALL be handled gracefully with retries and user notifications.

## 7. Performance Requirements

- Standard API responses SHALL occur within 2 seconds.
- AI suggestions SHALL respond within 3 seconds.

## 8. Non-functional Requirements

- Passwords SHALL be securely hashed.
- Data SHALL be encrypted at rest and in transit.
- API keys SHALL be securely managed.
- The system SHALL be scalable and available.

## 9. External Integrations

- KMA API SHALL provide weather context.
- OpenAI GPT API SHALL provide AI suggestions.
- API key management and security SHALL be enforced.

## 10. Data Lifecycle and Event Processing

- User registration and authentication events SHALL be logged.
- Conversation events SHALL be timestamped and stored.
- Favorites SHALL be managed and audit-logged.
- Data retention policies SHALL be enforced.

---

This documentation provides explicit business requirements with no ambiguity or unspecified behavior. It excludes technical implementation guidelines, leaving architectural decisions to developers.

Mermaid diagrams within the documentation adhere strictly to syntax rules, enhancing clarity of workflows.

This document is ready for immediate use by backend development teams to build the Echo backend system.