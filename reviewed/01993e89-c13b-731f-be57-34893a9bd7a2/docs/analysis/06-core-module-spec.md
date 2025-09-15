# Notification Workflow Backend Business Requirements

## 1. Service Overview
The Notification Workflow backend provides a robust engine for managing notification workflows composed of Email, SMS, and Delay nodes forming Directed Acyclic Graphs (DAGs). Users define workflows that are triggered idempotently, ensuring reliable sequential execution of notification steps. The system supports concurrent processing, detailed execution logging, and retry handling with exponential backoff.

## 2. User Roles and Permissions
- **workflowManager**: Can create, update, activate, deactivate, and delete workflows; view execution logs.
- **triggerOperator**: Can create triggers for workflows, monitor trigger statuses, and manage lifecycle.
- **systemAdmin**: Full permissions including user and system management.
- **workerService**: Automated role executing TriggerInstances concurrently.

## 3. Workflow Management
- THE system SHALL allow workflowManager roles to perform CRUD operations on workflows.
- WHEN creating or updating a workflow, THE system SHALL validate:
  - `entryNodeId` references a valid node.
  - All edges' `from` and `to` nodes exist.
  - Workflow graph is acyclic.
  - All Email and SMS templates are valid LiquidJS.
  - Delay nodes specify a valid `delayMs` or `duration`.
- THE system SHALL prevent deletion of active workflows with referenced triggers.
- THE system SHALL track version and update timestamps on workflow changes.

## 4. Trigger Management
- WHEN a trigger is created, THE system SHALL validate workflow existence and active status.
- THE system SHALL enforce uniqueness of `(workflowId, idempotencyKey)` pair.
- IF a duplicate trigger is detected, THE system SHALL return existing instance.
- TriggerInstances SHALL have states: `enqueued`, `processing`, `completed`, `failed`.
- Cursor SHALL track current execution node; advances after each successful step.

## 5. Worker Execution
- Workers SHALL concurrently process TriggerInstances with exclusive claim locks.
- Nodes are executed sequentially per workflow DAG.
- EmailNode and SmsNode execute by rendering templates, sending messages, and recording results in `vars`.
- DelayNode schedules resumption via BullMQ and updates `availableAt` accordingly.
- Failures increment attempts with exponential backoff; max 3 attempts.
- Exceeded retries result in `failed` state.

## 6. Core Module
- Defines domain entities (Workflow, Node, Edge, TriggerInstance).
- Enforces domain invariants and validation rules.
- Exposes interfaces for workflow loading, validation, trigger creation, and node execution.
- Manages execution context immutability and merging.

## 7. Business Rules
- Workflow must be DAG with valid nodes and edges.
- Templates validated for syntax correctness.
- Trigger uniqueness ensured via `(workflowId, idempotencyKey)`.
- Retry logic with backoff and capped attempts.
- Idempotency guaranteed by inbox pattern and message tracking.
- Execution logs record success, failure, context snapshots.

## 8. User Scenarios
- Trigger creation with idempotency check.
- Sequential execution of Email → Delay → SMS nodes.
- Handling of success completion and retry on failure.
- Concurrent processing by multiple worker instances.
- DelayNode pauses execution respecting `availableAt` using BullMQ.

## 9. Error and Retry Handling
- Errors classified as transient or permanent.
- Transient errors trigger retries with backoff.
- Permanent errors mark TriggerInstance as failed immediately.
- Retried steps execute idempotently to avoid duplicates.

## 10. Validation
- Workflow creation/update validates entry node, edges, acyclicity, and node schemas.
- Trigger creation validates workflow active state and key uniqueness.
- Node templates parse-checked before acceptance.
- Delay durations converted and validated.

## Diagrams
All Mermaid diagrams use double quotes on labels and proper arrow syntax to illustrate workflows, states, and process flows clearly.

---

This document defines the business requirements only. Technical implementations such as APIs, database designs, and infrastructure decisions are left to the discretion of the development team.