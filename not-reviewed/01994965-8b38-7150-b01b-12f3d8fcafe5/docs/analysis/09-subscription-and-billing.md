# Functional Requirements Specification for Telegram File Downloader API

## 1. Introduction

This document details the functional requirements for the Telegram File Downloader API backend service. It provides specific business rules, user interactions, and detailed processing logic for core features including file downloads, storage management, API endpoints, subscription management, and the web dashboard. It is intended for backend developers tasked with building and integrating these features.

All descriptions focus on WHAT the system must do, omitting technical implementation specifics.


## 2. Business Model Overview

### Why This Service Exists

Telegram channels and groups frequently share various media and document files. Accessing and managing these files directly through Telegram interfaces can be cumbersome for users and developers. This service automates the downloading of files from Telegram channels/groups on user demand or via API, providing an organized, accessible repository for these files.

The service addresses the need for an efficient, scalable file acquisition platform with tiered subscription monetization.

### Revenue Strategy

Monetization is implemented via a freemium subscription model using Stripe integration. The Free tier offers basic service limits, while the Pro tier provides unlimited downloads and enhanced capabilities for a monthly fee.

### Growth Plan

User acquisition will focus on Telegram end users seeking easier access to media and documents, as well as developers and marketers requiring bulk file gathering. Retention depends on consistent service performance and subscription engagement.

### Success Metrics

- Number of active subscriptions (Free and Pro)
- Daily and monthly downloaded files count
- Storage utilization
- API usage rates
- Customer satisfaction and payment conversion rates


## 3. User Roles and Permissions

| Role            | Description                                                                                                                      | Permissions and Capabilities                                                                                         |
|-----------------|----------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| End User        | Individuals who download files from Telegram channels/groups using the web dashboard.                                            | Can sign up/login, submit download requests for one channel at a time, view download status and retrieved files, manage subscription plans. Limited to plan's download quotas and storage.
|
| Developer       | Developers or marketers who use REST API endpoints for automated file downloads and status checks.                              | Can authenticate via API, initiate downloads, query job status, list downloaded files. Subject to subscription limits and rate limiting.
|
| Administrator   | System admins managing subscriptions, monitoring logs and payment statuses through a secure admin panel.                        | Can manage user subscriptions, view system logs, monitor storage usage, review download metrics, handle billing and payment information.


## 4. Functional Requirements

### 4.1 File Download Process

#### 4.1.1 Download Request

WHEN a user (end user or developer) submits a file download request with a valid channel or group ID, THE system SHALL:
- Validate the channel/group ID format.
- Validate that the user has sufficient quota under their subscription plan.
- Accept a single channel/group ID per request.
- Accept optional file-type filters (e.g., mp4, zip, jpg, pdf).
- Accept optional date range parameters specifying the start and end date for files shared in that range (start and end inclusive).
- Limit free plan users to request downloads of up to 10 files total per day and maximum 100MB per file.
- Allow Pro users to request unlimited downloads with configurable maximum file sizes (default 2GB).
- Enqueue the download job and return a job ID for progress tracking.

#### 4.1.2 Download Processing

WHILE processing a download job, THE system SHALL:
- Fetch files shared in the specified Telegram channel/group during the date range.
- Filter files by the specified file types if provided.
- Download each qualifying file locally.
- Upload the downloaded files to AWS S3 storage.
- Generate a signed URL for each file providing authenticated access valid for 7 days.

#### 4.1.3 Download Completion

WHEN a download job completes, THE system SHALL:
- Update the job status to "completed".
- Provide the list of signed URLs for the downloaded files to the user.
- Track the files against user's storage quota.


### 4.2 Storage Management

- Files SHALL be stored locally initially, then uploaded to AWS S3.
- THE system SHALL automatically delete files older than 7 days to enforce retention policies.
- Download links SHALL be signed URLs to prevent unauthorized public access.
- Storage usage SHALL be tracked per user to enforce free tier limits.
- Pro users SHALL have expanded storage and file size limits configurable in the system.


### 4.3 API Endpoint Functionalities

THE system SHALL provide the following API endpoints:

| Endpoint              | Method | Purpose                                   |
|-----------------------|--------|-------------------------------------------|
| /download             | POST   | Submit a file download job request        |
| /status/{jobId}       | GET    | Check the progress/status of a download job |
| /files                | GET    | List all files downloaded and accessible  |
| /me                   | GET    | Return user profile and subscription info |
| /usage                 | GET    | Return current quota usage for the user   |

THE API SHALL:
- Authenticate users using JWT tokens issued on login.
- Enforce rate limits based on subscription plan.
- Return clear, actionable status codes and error messages.


### 4.4 Subscription Plans and Limits

- The system SHALL support two subscription tiers:
  - Free Tier: limited to 10 files per day, max 1GB total storage, max 100MB per file.
  - Pro Tier ($9.99/month): unlimited download count, larger max file size (default 2GB), unlimited storage quota.
- WHEN a user successfully makes a payment via Stripe, THE system SHALL update the user profile to Pro tier.
- THE system SHALL enforce subscription limits on download count, file size, storage usage, and rate limiting for API and dashboard usage.


### 4.5 Dashboard Features

- End users SHALL be able to log in using email and password.
- The dashboard SHALL allow users to:
  - Submit download requests with channel ID, filters, and date ranges.
  - View and track the download job status in real-time.
  - View and access signed download links for completed files.
  - Monitor subscription status and billing information.
- Administrators SHALL have a separate admin panel that:
  - Displays system metrics (downloads count, storage usage, active subscriptions).
  - Provides access to payment and billing logs.
  - Manages user subscriptions and service statuses.


## 5. Business Rules and Validation

- User login SHALL require email verification and password reset capabilities.
- File download requests SHALL validate channel ID format and reject invalid requests.
- Only one channel/group ID per download request is allowed.
- File-type filters SHALL accept a list of recognized file extensions.
- Date ranges MUST be validated to ensure the start date is not after the end date.
- Storage retention period SHALL be exactly 7 days; files older than this SHALL be purged.
- Download links SHALL expire exactly 7 days after generation.
- Quota usage counts SHALL reset daily at midnight based on the Asia/Seoul timezone.
- API rate limits SHALL differentiate between Free and Pro users.


## 6. Error Handling and Recovery

- IF user authentication fails, THEN the system SHALL return HTTP 401 Unauthorized with error code AUTH_INVALID_CREDENTIALS.
- IF a download request exceeds quota, THEN the system SHALL return an appropriate error message indicating the exceeded limit.
- IF Telegram API access fails during file fetching, THEN the system SHALL retry automtically up to 3 times before failing the job.
- IF a requested file type is unsupported, THEN the system SHALL notify the user of the invalid filter.
- IF storage upload to AWS S3 fails, THEN the system SHALL log the error, notify the user of partial failure, and retry.
- Users SHALL be able to cancel pending download jobs before completion.


## 7. Performance Requirements

- THE system SHALL respond to login and API requests within 2 seconds under normal load.
- THE system SHALL provide download job status updates at least once every 5 seconds.
- THE system SHALL generate signed file URLs instantly after upload completion.


## 8. Glossary and Definitions

- **Channel/Group ID**: Identifier for a Telegram channel or group.
- **Signed URL**: Temporary HTTP URL granting authorized access to a stored file.
- **Job ID**: Unique identifier for a background download request.
- **Quota**: Limits on number of downloads or storage.
- **JWT**: JSON Web Token used for auth.


---

This document captures all functional aspects, business rules, and user interactions necessary to develop the Telegram File Downloader API backend service. Technical architecture, database schema, or API specification documents are handled separately.

All technical implementation decisions including architectural design, database schema, API contracts, and security specifics rest solely with the development team.

