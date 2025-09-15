import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * E2E test for updating a workflow node successfully within a workflow.
 *
 * This test covers the main scenario of a workflowManager user who:
 *
 * 1. Registers to become a workflowManager user.
 * 2. Creates a new workflow.
 * 3. Creates a workflow node within that workflow.
 * 4. Updates the workflow node with diverse properties including nodeType,
 *    name, email and SMS templates, delay settings.
 * 5. Validates that the updated workflow node fields match the update request.
 *
 * The test asserts correct API responses and role-based authentication
 * handling. It ensures valid UUIDs, string formats, and business rule
 * compliance for node update.
 *
 * Steps:
 *
 * - Join as a workflowManager user with generated email and password.
 * - Create a workflow with a generated code, name, is_active true, version 1,
 *   and a temporary entry_node_id.
 * - Create a workflow node linked to the created workflow.
 * - Update the workflow node with new values for all properties including
 *   templates and delays.
 * - Assert the updated node matches the update input.
 */
export async function test_api_workflow_workflownode_update_successful(
  connection: api.IConnection,
) {
  // 1. Join as workflowManager user
  const workflowManagerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const workflowManagerPassword: string = RandomGenerator.alphaNumeric(12);
  const workflowManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: workflowManagerEmail,
        password_hash: workflowManagerPassword,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(workflowManager);

  // 2. Create a new workflow with a unique code and name
  const workflowCode = RandomGenerator.alphaNumeric(8);
  const workflowName = RandomGenerator.name();
  const workflowCreateBody = {
    code: workflowCode,
    name: workflowName,
    is_active: true,
    entry_node_id: "00000000-0000-0000-0000-000000000000", // Temporary ID placeholder
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);

  // 3. Create a workflow node associated to the workflow
  const workflowNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: "Initial Node",
    email_to_template: "{{ recipient_email }}",
    email_subject_template: "Welcome to {{ workflow_name }}",
    email_body_template: "Hello {{ user_name }}, this is your notification.",
    sms_to_template: "{{ recipient_phone }}",
    sms_body_template: "Hi {{ user_name }}, check your email!",
    delay_ms: 0,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const workflowNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: workflowNodeCreateBody,
      },
    );
  typia.assert(workflowNode);

  // 4. Update the workflow node with new diverse values
  const updateBody = {
    workflow_id: workflow.id,
    node_type: "SmsNode",
    name: "Updated Node",
    email_to_template: "{{ new_email }}",
    email_subject_template: "Updated Subject: {{ new_subject }}",
    email_body_template:
      "Dear {{ new_name }}, your notification content updated.",
    sms_to_template: "{{ new_phone }}",
    sms_body_template: "New SMS content for {{ new_name }}.",
    delay_ms: 120000, // 2 minutes
    delay_duration: "PT2M", // ISO 8601 duration
    deleted_at: null,
  } satisfies INotificationWorkflowWorkflowNode.IUpdate;

  const updatedNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.updateWorkflowNode(
      connection,
      {
        workflowId: workflow.id,
        workflowNodeId: workflowNode.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNode);

  // 5. Assert the updated node returned matches the update request
  TestValidator.equals(
    "workflow ID matches",
    updatedNode.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "node type updated",
    updatedNode.node_type,
    updateBody.node_type,
  );
  TestValidator.equals("name updated", updatedNode.name, updateBody.name);
  TestValidator.equals(
    "email_to_template updated",
    updatedNode.email_to_template ?? null,
    updateBody.email_to_template,
  );
  TestValidator.equals(
    "email_subject_template updated",
    updatedNode.email_subject_template ?? null,
    updateBody.email_subject_template,
  );
  TestValidator.equals(
    "email_body_template updated",
    updatedNode.email_body_template ?? null,
    updateBody.email_body_template,
  );
  TestValidator.equals(
    "sms_to_template updated",
    updatedNode.sms_to_template ?? null,
    updateBody.sms_to_template,
  );
  TestValidator.equals(
    "sms_body_template updated",
    updatedNode.sms_body_template ?? null,
    updateBody.sms_body_template,
  );
  TestValidator.equals(
    "delay_ms updated",
    updatedNode.delay_ms ?? null,
    updateBody.delay_ms,
  );
  TestValidator.equals(
    "delay_duration updated",
    updatedNode.delay_duration ?? null,
    updateBody.delay_duration,
  );
  TestValidator.equals(
    "deleted_at updated",
    updatedNode.deleted_at ?? null,
    updateBody.deleted_at,
  );
}
