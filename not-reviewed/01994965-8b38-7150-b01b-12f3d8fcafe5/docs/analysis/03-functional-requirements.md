# Functional Requirements Specification for Telegram File Downloader API

## 1. Introduction
This specification defines the core functional requirements for the Telegram File Downloader API backend service. It is intended to guide backend developers in implementing the system's key business logic, including file downloads from Telegram channels/groups, storage management, API interaction, subscription enforcement, and dashboard features.

The service enables users and developers to request downloads of media and documents shared on Telegram channels/groups, applying filters and date ranges, and provides secure access to these files via signed URLs hosted in AWS S3.

## 2. Business Model Overview
Telegram channels and groups share diverse content that users and marketers want to archive or process offline. Telegram APIs do not provide seamless bulk downloading and subscription management.

This service fills the gap by automating on-demand file downloads, providing authenticated access, and monetizing via subscription tiers (Free and Pro). Users can operate via web dashboards or API endpoints, and administrators oversee system health and billing.

## 3. User Roles and Permissions

### 3.1 End Users
- Access via web dashboard.
- Submit download jobs for a single Telegram channel/group.
- Apply file-type and date range filters.
- Download files using signed URLs.
- Subject to Free (10 files/day, 100MB/file) or Pro limits (unlimited, configurable max file size).

### 3.2 Developers
- Access API endpoints with JWT authentication.
- Submit download jobs and query job status.
- List completed files.
- Retrieve profile and quota information.
- Subject to same subscription limits as end users.

### 3.3 Administrators
- Access separate admin panel.
- Manage user subscriptions and payment status.
- Monitor download job logs and system metrics.

## 4. Functional Requirements

### 4.1 File Download Process

#### 4.1.1 Download Request Handling
WHEN a user submits a download request with a valid Telegram channel/group ID, THE system SHALL:
- Validate input parameters including channel/group ID format.
- Check user subscription and quota limits.
- Accept only one channel/group ID per request.
- Process optional file-type filters and inclusive date ranges.
- For Free users, limit to 10 files/day and max 100MB per file.
- For Pro users, allow unlimited files/day and max 2GB per file by default.
- Enqueue the download job and return a job ID immediately within 2 seconds.

#### 4.1.2 Download Job Processing
WHILE processing the download job, THE system SHALL:
- Retrieve files matching filters from Telegram channel/group.
- Download files locally.
- Upload files asynchronously to AWS S3.
- Generate signed URLs valid for exactly 7 days.

#### 4.1.3 Download Completion
WHEN download completes, THE system SHALL:
- Update job status to "completed".
- Provide accessible signed URLs to the user.
- Track usage against user quotas.

### 4.2 Storage Management
- THE system SHALL retain files for exactly 7 days.
- Files older than 7 days SHALL be deleted automatically from storage.
- Storage limits enforced per user according to plan: 1GB for Free, expanded for Pro.
- Signed URLs SHALL require authentication and prevent unauthorized access.

### 4.3 API Endpoints
- POST /download: Accept download parameters, return job ID.
- GET /status/{jobId}: Return job progress and status.
- GET /files: List user's completed downloads.
- GET /me: Return user profile and subscription status.
- GET /usage: Return user's quota consumption and limits.

THE API SHALL enforce JWT authentication and rate limits based on subscription plan.

### 4.4 Subscription Plans
- Free Plan: 10 files/day limit, 100MB max per file, 1GB total storage.
- Pro Plan ($9.99/month): Unlimited files, 2GB max per file (configurable), expanded storage.
- Subscriptions managed with Stripe, updated instantly upon successful payment.
- User plans influence quota enforcement and API rate limiting.

### 4.5 Dashboard Features
- Users can log in with email/password.
- Submit download requests with filters.
- View download job progress and results.
- Access signed URLs for completed files.
- Manage subscription and billing details.
- Administrators have dashboard for system metrics, user management, and payment logs.

## 5. Business Rules and Validation

- Requests SHALL validate channel/group ID syntax.
- Only one channel/group ID per download request is allowed.
- File-type filters accept known extensions (mp4, jpg, pdf, zip).
- Date ranges must have start date <= end date.
- Download links expire exactly after 7 days.
- Daily quota counters reset at midnight Asia/Seoul timezone.
- System SHALL reject requests exceeding quotas with appropriate errors.
- Unauthorized access and input validation failures respond with clear API error messages.

## 6. Error Handling and Recovery

- Invalid login credentials SHALL return HTTP 401 with error details.
- Exceeding quotas SHALL return errors indicating quota exhaustion.
- Telegram API failures shall be retried automatically up to 3 times.
- Unsupported file types SHALL cause request rejection.
- Failed AWS S3 uploads SHALL be retried and notify users/admins on persistent failure.
- Users may cancel active download jobs.

## 7. Performance Requirements

- Request submissions SHALL be acknowledged within 2 seconds.
- Status queries SHALL respond within 1 second.
- Download progress updates SHALL be available every 5 seconds.
- File uploads to S3 SHALL be timely to enable access within minutes.

## 8. Glossary

- JWT: JSON Web Token for authentication.
- AWS S3: Amazon Simple Storage Service for file hosting.
- Stripe: Payment processing platform.
- Job ID: Unique identifier for download jobs.
- Signed URL: Temporary, secure URL for file download access.

---

This document is a full set of business requirements for core functions of the Telegram File Downloader API backend. Implementation specifics, API contract details, and technical architecture are out of scope and left to developer discretion.