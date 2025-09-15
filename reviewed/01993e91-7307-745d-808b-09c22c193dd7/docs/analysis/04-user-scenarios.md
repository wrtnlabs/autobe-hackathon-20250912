# User Scenarios for Task Management Backend API Server

## 1. Introduction

### 1.1 Purpose of Document
This document thoroughly defines all user scenarios and workflows related to task management activities for the backend API server. It supports backend developers in understanding the business logic, user interactions, role-based permissions, and system responses.

### 1.2 Scope
The scenarios focus exclusively on business processes for managing tasks, assignments, status changes, notifications, and project/board organization. Technical implementation, data storage models, and UI design are beyond the scope.

### 1.3 Definitions and Glossary
- **Task:** A discrete unit of work to be managed within projects.
- **Board/Project:** Logical grouping of related tasks.
- **User Roles:** Technical Project Manager (TPM), Project Manager (PM), Project Management Officer (PMO), Developer, Designer, QA.

## 2. System Overview

### 2.1 Business Context
The system enables cross-role collaboration and task tracking essential for project success in multi-disciplinary teams. Inspired by Trello, it emphasizes clear task assignment, structured workflows, and timely notifications.

### 2.2 Key Features Summary
- Role-based task creation and assignment
- Status transition management
- Notification delivery
- Task grouping in boards/projects

## 3. User Roles and Interactions

### 3.1 Technical Project Manager (TPM)
- Assign tasks, manage deadlines, monitor progress.

### 3.2 Project Manager (PM)
- Plan projects, allocate resources, assign and monitor tasks.

### 3.3 Project Management Officer (PMO)
- Enforce standards, compliance, oversee project governance.

### 3.4 Developer
- Execute assigned tasks, update progress.

### 3.5 Designer
- Complete design-related tasks, update status.

### 3.6 Quality Assurance (QA)
- Test deliverables, report issues, update task status.

## 4. Core User Scenarios

### 4.1 Task Creation
- WHEN a user in role TPM, PM, or PMO creates a task, THE system SHALL record all task attributes, set the initial status to "To Do", and notify relevant users.

### 4.2 Task Assignment
- WHEN a user with assignment permissions assigns a task, THE system SHALL update the task’s assignees and notify those users within 1 second.

### 4.3 Task Status Update
- WHEN an assignee updates the task status, THE system SHALL validate the transition, update the task record, and notify project managers.

### 4.4 Task Commenting
- WHEN a participant comments on a task, THE system SHALL save the comment with timestamps and notify all assigned users.

### 4.5 Board and Project Management
- Users with appropriate permissions SHALL create and manage boards and projects to organize tasks logically.

## 5. Detailed Scenario Workflows

### 5.1 Creating a Task
1. User accesses task creation endpoint.
2. Provides mandatory and optional fields.
3. System validates inputs.
4. System creates task record with timestamps.
5. System sends notifications.

### 5.2 Assigning Tasks
1. User selects task and assigns valid assignee(s).
2. System verifies permissions.
3. System updates assignments.
4. System sends notifications promptly.

### 5.3 Updating Task Status
1. Assigned user changes status.
2. System verifies valid status flow.
3. Updates task and timestamps.
4. Notifies stakeholders.

### 5.4 Commenting
1. User submits comment.
2. System saves with timestamp and author.
3. Notifications sent to involved users.

### 5.5 Notification Triggers
- Assignments, status updates, comments trigger immediate notifications.

## 6. Business Rules and Constraints
- Task title is mandatory and must not be empty.
- Valid status transitions enforced.
- Only authorized roles can assign tasks.
- Assignees must be project members.
- Due dates cannot be set in the past.

## 7. Error Handling
- Unauthorized actions are rejected with clear errors.
- Validation errors return detailed messages.
- Invalid status transitions are denied.

## 8. Performance Expectations
- Task creation, assignment, and updates SHALL respond within 2 seconds.
- Notifications SHALL be delivered within 2 seconds.

## 9. Summary
This document specifies detailed user scenarios and workflows in unambiguous business language. It empowers backend developers to implement precise business logic with clarity on roles, permissions, workflows, error handling, and performance expectations.

---

**Note:** This document describes business requirements only. Implementation details such as API design and database structures are left to the discretion of the development team. The focus is on WHAT the system must do, not HOW.