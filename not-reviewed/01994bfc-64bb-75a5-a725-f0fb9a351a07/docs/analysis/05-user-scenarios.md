# Community AI Website User Scenarios and Journeys

This document defines the detailed user journeys and scenarios for the community AI website, focusing on the major workflows that include classic community interactions and AI-powered features such as AI Commenting and AI Factcheck. It provides backend developers with clear, unambiguous business requirements and user behavior specifications necessary for implementation.

---

## Introduction

The community AI website is a platform where registered members can create posts, comment with AI assistance, and verify the truthfulness of content using AI fact-check mechanisms. Moderators and administrators oversee content quality and community interactions. This document outlines the user interactions, business rules, error scenarios, and performance expectations for the core user journeys.

---

## 1. User Registration and Login

### Overview
Users must be able to create accounts, authenticate, and manage sessions securely to participate actively on the platform.

### User Roles Involved
- Admin
- Moderator
- Member

### Scenarios

#### 1.1 User Registration
- WHEN a new user submits registration data with valid email, password, and required profile details, THE system SHALL create a user account with member role assigned.
- WHEN a user registers, THE system SHALL send a verification email with a unique token.
- IF the email verification token is valid, THEN THE system SHALL mark the user’s email as verified.
- IF the user attempts to register with an existing email, THEN THE system SHALL deny registration and show an appropriate error.

#### 1.2 User Login
- WHEN a user submits correct login credentials, THE system SHALL authenticate the user and issue a JWT access token and refresh token.
- WHEN a user with unverified email attempts login, THE system SHALL deny access and prompt email verification.
- IF a user submits invalid login credentials, THEN THE system SHALL reject the login attempt with a clear error message.
- WHEN a user logs out, THE system SHALL invalidate the session tokens.

#### 1.3 Session Management
- THE system SHALL maintain active sessions with 30-minute inactivity expiration.
- THE system SHALL allow token refresh using refresh tokens within 30 days of issuance.

### Error Scenarios
- Invalid registration inputs (e.g., password too short, invalid email format) result in immediate rejections with specific error messages.
- Login attempts during system downtime trigger maintenance messages.

### Performance
- Authentication responses SHALL be processed within 2 seconds for 95% of requests.

---

## 2. Creating Posts

### Overview
Members create posts as primary content units for discussion. Posts go through moderation depending on system configuration.

### Scenarios

#### 2.1 Post Creation
- WHEN a member submits a new post with title and content, THE system SHALL store the post under their user ID.
- IF post content violates prohibited content policies (e.g., hate speech, spam), THEN THE system SHALL flag the post for moderator review.
- WHEN post moderation is enabled, THE system SHALL mark posts as pending until moderator approval.

#### 2.2 Post Editing
- WHEN a member edits their post within 24 hours of creation, THE system SHALL allow updates.
- IF member attempts to edit after 24 hours, THEN THE system SHALL deny edits and notify the user.

### Business Rules
- Posts must have a non-empty title between 5 and 100 characters.
- Post content is limited to 10,000 characters.

### Error Scenarios
- Missing mandatory fields result in an error rejecting the post.
- Attempts to create posts when not authenticated SHALL be rejected.

### Performance
- Post creation response SHALL be within 3 seconds under normal load.

---

## 3. Commenting with AI Assistance

### Overview
Members can comment on posts. AI-assisted commenting provides suggestions for improving comments or auto-generating reply drafts.

### Scenarios

#### 3.1 Basic Commenting
- WHEN a member submits a comment with valid text, THE system SHALL store the comment linked to the target post and user.
- Comments SHALL be limited to 500 characters.

#### 3.2 AI Comment Suggestion
- WHEN a member requests AI assistance on a comment draft, THE system SHALL call AI services to provide suggested text improvements or alternative phrasings.
- WHEN AI suggestions are received, THE system SHALL respond within 2 seconds to the user interface.
- Members SHALL be able to accept, modify, or reject AI suggestions.

#### 3.3 Sentiment Analysis
- THE system SHALL analyze new comments for sentiment.
- IF a comment is detected as toxic or inappropriate by AI analysis, THEN THE system SHALL flag it for moderator review.

### Business Rules
- AI commenting is an optional feature and requires explicit user action to request.
- Comments flagged by AI for toxicity SHALL not be published until moderator review unless overridden by admin.

### Error Scenarios
- AI service failures SHALL cause the system to fallback to normal commenting without AI suggestions and notify the user about limited AI assistance.

### Performance
- AI comment suggestions SHALL be returned within 2 seconds 90% of the time.

---

## 4. Using AI Factcheck

### Overview
Users can trigger AI fact-checking on posts or comments to verify statements.

### Scenarios

#### 4.1 Factcheck Request
- WHEN a member selects a statement or entire post/comment for fact-check, THE system SHALL submit the content to the AI fact-check service.
- THE system SHALL present fact-check results including verification status (true, false, uncertain) and reference sources.

#### 4.2 Factcheck Outcome
- IF fact-check returns false or uncertain, THEN THE system SHALL flag the content and notify moderators.
- Users SHALL see a fact-check badge with the verification status.

### Business Rules
- Fact-checking services SHALL adhere to privacy policies around content usage.
- Fact-check results SHALL be cached for one hour to optimize repeated requests.

### Error Scenarios
- Fact-check service downtime SHALL result in graceful user notifications and an option to retry.

### Performance
- Fact-check responses SHALL be returned within 5 seconds under nominal load.

---

## 5. Moderation and Reporting

### Overview
Moderators and admins oversee content quality, manage flagged content, and enforce community guidelines.

### Scenarios

#### 5.1 Reviewing Flags
- WHEN content is flagged by AI or users, THE system SHALL list flags in a moderation queue.
- Moderators SHALL review flags, and approve, reject, or escalate them.

#### 5.2 User Reporting
- Members SHALL be able to report posts and comments.
- THE system SHALL associate reports with user IDs and content IDs.

#### 5.3 Moderator Actions
- Moderators SHALL be able to delete content, warn users, or escalate issues to admins.

### Business Rules
- Moderators cannot override admin decisions.
- Admins have final authority on all moderation decisions.
- Moderators' actions SHALL be logged for auditing.

### Error Scenarios
- Conflicting moderation actions SHALL trigger a conflict resolution workflow.

### Performance
- Flag listings and actions SHALL be processed within 3 seconds.

---

## 6. Notification Reception

### Overview
Users receive notifications about replies, likes, moderation results, and AI alerts.

### Scenarios

#### 6.1 Notification Types
- New comment replies
- Post likes
- Content flagged by AI fact-check
- Moderator messages

#### 6.2 Delivery
- Notifications SHALL be delivered via in-app message system and optionally via email.
- Users SHALL be able to configure notification preferences.

### Business Rules
- Notifications SHALL not be delayed more than 60 seconds after the triggering event.
- Critical notifications from moderators SHALL bypass user preferences.

---

## Summary
This document comprehensively describes the key user journeys within the community AI website, emphasizing the AI-enhanced features for commenting and fact-checking. Backend developers can use these scenarios to build the system's core workflows, ensuring alignment with business rules, user expectations, and performance standards.


---

This document defines business requirements only. All technical implementation decisions belong to developers. Developers have full autonomy over architecture, APIs, and database design. The document describes WHAT the system should do, not HOW to build it.