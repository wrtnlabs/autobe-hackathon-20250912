# Task Management Backend API - Business and Functional Requirements

## 1. Service Overview

### 1.1 Business Model
The Task Management API provides a centralized backend for managing project tasks across diverse roles including TPMs, PMs, PMOs, developers, designers, and QA. It addresses the demand for structured task assignment, collaborative progress tracking, and notifications that improve team efficiency and transparency.

### 1.2 Revenue and Growth Strategy
Initially targeting internal teams, the service aims for future monetization through subscription models and third-party integrations. Growth focuses on adoption by agile project teams and enhancement of extensible workflows.

## 2. User Roles and Authentication

### 2.1 Roles
- Technical Project Manager (TPM): Oversees technical project deadlines and coordinates the team.
- Project Manager (PM): Manages project execution and resource allocation.
- Project Management Officer (PMO): Defines methodologies, compliance, and governance.
- Developer: Implements project tasks, code features, and bug fixes.
- Designer: Develops UI/UX design elements.
- Quality Assurance (QA): Conducts testing and ensures quality standards.

### 2.2 Authentication Process
Users authenticate via email/password, supported by JWT tokens containing user identity, role, and permissions. Access tokens expire after 30 minutes, with refresh tokens valid for 14 days.

## 3. Functional Requirements

### 3.1 Task Entity
Tasks include attributes: title, description, status (To Do, In Progress, Done), priority (Low, Medium, High), due date, assignees, and timestamps.

### 3.2 Task Lifecycle
- Creating tasks with required and optional attributes.
- Updating tasks with validation.
- Deleting tasks with appropriate permissions.
- Assigning tasks only to project members with valid roles.

### 3.3 Notification Handling
The system dispatches notifications on task creation, assignment, status changes, and comments, promptly delivering alerts to relevant users.

## 4. User Workflows

### 4.1 Task Creation
Authorized users submit task details; the system validates and stores tasks with a default 'To Do' status.

### 4.2 Task Assignment
Users with assignment rights assign tasks to one or more users; notifications are sent accordingly.

### 4.3 Task Updates
Assignees update task status and details; changes are logged and communicated to relevant stakeholders.

## 5. Business Rules

- Task titles are mandatory, non-empty, and limited to 255 characters.
- Due dates must be in the future relative to task creation.
- Task assignments require valid project membership and role permissions.
- Status changes occur only along permitted transitions.

## 6. Error Handling

- Validation errors return detailed messages indicating specific issues.
- Unauthorized actions trigger permission denied responses.
- Invalid assignments or status updates are rejected with explanations.

## 7. Performance Expectations

- API operations respond within 2 seconds under standard load.
- Notifications are delivered within 5 seconds of triggering events.

## 8. Developer Autonomy Statement
This document outlines business requirements only. All architectural, API, and data design decisions are delegated to the development team. The document specifies WHAT the system SHALL do, not HOW to build it.