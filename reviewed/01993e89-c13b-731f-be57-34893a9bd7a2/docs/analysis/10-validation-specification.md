# Notification Workflow Backend System - Business Requirements

## 1. Service Overview

### 1.1 Introduction
The Notification Workflow backend system provides a robust, scalable platform for orchestrating event-driven notification workflows consisting of Email, SMS, and Delay nodes. It supports idempotent triggers, content templating via LiquidJS, concurrency-safe step executions, retry policies with exponential backoff, and detailed execution logging.

### 1.2 Business Model
The system addresses critical market needs for reliable, customizable notification orchestration to improve operational efficiency and customer engagement. It offers a subscription licensing model with pay-per-use options.

### 1.3 Success Metrics
Key indicators include system uptime, trigger throughput, idempotency success rate, and customer satisfaction from timely message delivery.

## 2. User Roles and Permissions

### 2.1 Roles
- **workflowManager:** Full CRUD on workflows; activate/deactivate; view execution logs.
- **triggerOperator:** Create trigger instances; monitor and manage triggers.
- **systemAdmin:** Full system administration; user/role management.
- **workerService:** Automated worker processing triggers.

### 2.2 Permissions Matrix
| Capability                   | workflowManager | triggerOperator | systemAdmin | workerService |
|------------------------------|-----------------|-----------------|-------------|---------------|
| Create/Read/Update/Delete Workflow | ✅            | ❌              | ✅          | ❌            |
| Activate/Deactivate Workflow   | ✅             | ❌              | ✅          | ❌            |
| Create Trigger Instance         | ❌             | ✅              | ✅          | ❌            |
| View Trigger Status/Logs        | ❌             | ✅              | ✅          | ❌            |
| Manage Users/Roles              | ❌             | ❌              | ✅          | ❌            |
| Process Trigger Instances (Worker) | ❌            | ❌              | ❌          | ✅            |

## 3. Workflow Management

### 3.1 CRUD Operations
- Create, read, update, delete workflows with validation
- Validate DAG acyclicity, node schemas, template syntax
- Enforce activation rules

### 3.2 Validation
- Entry node must exist
- Edges reference valid nodes and no self-loops
- Delay nodes specify valid delayMs or duration

## 4. Trigger Management

### 4.1 Creation and Uniqueness
- Enforce workflow existence and active status
- Enforce unique (workflowId, idempotencyKey)
- Return existing TriggerInstance on duplicate

### 4.2 States and Transitions
- States: enqueued, processing, completed, failed
- Valid transitions and cursor management

### 4.3 Retry Logic
- Increment attempts on failures
- Exponential backoff delay
- Max attempts: 3

## 5. Worker Execution

- Concurrent processing of TriggerInstances
- Horizontal scale-out
- Step execution: email, sms, delay nodes
- Cursor advancement
- Retry and failure handling

## 6. Core Module

- Domain model entities and aggregates
- Validation logic
- Execution context and merging
- Node execution interfaces
- Access by API and worker

## 7. Business Rules

- Workflow invariants
- Trigger uniqueness
- Template rendering rules
- Delay duration standards
- Error handling

## 8. User Scenarios

- Trigger workflow creation
- Step-wise execution
- Success and failure management
- Concurrent triggers
- Delayed execution

## 9. Error and Retry Handling

- Error classification
- Retry/backoff policies
- Failure state marking
- Idempotency best practices

## 10. Validation Specification

- Workflow validation rules
- Trigger validation
- Template syntax validation
- Delay and duration validation
- Execution context integrity


## Illustrative Mermaid Diagrams Included Throughout

---

This document comprises complete, detailed, unambiguous business requirements for backend developers to implement the Notification Workflow system as specified. All domain rules, user interactions, and operations are precisely defined in natural language with testable criteria.

*This document provides business requirements only. Implementation decisions (architecture, API, data design) are at the discretion of the development team.*

---