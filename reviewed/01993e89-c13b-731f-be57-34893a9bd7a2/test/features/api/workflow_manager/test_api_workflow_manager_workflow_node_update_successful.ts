import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * Test workflow manager user updating a workflow node within a notification
 * workflow.
 *
 * This test simulates the real-world business scenario of managing notification
 * workflows:
 *
 * 1. Creates a new workflow manager user and authenticates by calling join
 *    endpoint.
 * 2. Creates a notification workflow with a unique code, name, active status,
 *    random version, and a random UUID for entry node (accepting this as test
 *    placeholder).
 * 3. Creates a workflow node of type 'email-node' under the created workflow with
 *    initial LiquidJS templates for email and SMS.
 * 4. Updates the workflow node with new templates, verifying the returned updated
 *    node matches the update request.
 *
 * Validation is performed with typia.assert and TestValidator.equals for key
 * properties.
 */
export async function test_api_workflow_manager_workflow_node_update_successful(
  connection: api.IConnection,
) {
  // 1. Create and authenticate workflow manager user
  const joinBody = {
    email: (RandomGenerator.alphaNumeric(8).toLowerCase() +
      "@company.com") satisfies string,
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;
  const user = await api.functional.auth.workflowManager.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. Create notification workflow
  const workflowCreateBody = {
    code: "wf-" + RandomGenerator.alphaNumeric(6),
    name: "Test Workflow " + RandomGenerator.alphabets(4),
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);
  TestValidator.equals("workflow code", workflow.code, workflowCreateBody.code);

  // 3. Create workflow node under the created workflow
  const nodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "email-node",
    name: "Initial Email Node",
    email_to_template: "{{user.email}}",
    email_subject_template: "Welcome to our service",
    email_body_template: "Hello {{user.name}}, your account created.",
    sms_to_template: "{{user.mobile}}",
    sms_body_template: "Welcome message",
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: nodeCreateBody },
    );
  typia.assert(node);
  TestValidator.equals(
    "workflow node workflow_id",
    node.workflow_id,
    workflow.id,
  );
  TestValidator.equals("workflow node name", node.name, nodeCreateBody.name);

  // 4. Update the workflow node with new template data
  const updateBody = {
    name: "Updated Email Node",
    node_type: "email-node",
    email_to_template: "{{user.email}}",
    email_subject_template: "Updated Subject",
    email_body_template: "Updated body with {{user.name}}",
    sms_to_template: "{{user.mobile}}",
    sms_body_template: "Updated SMS content",
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.IUpdate;
  const updatedNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.updateWorkflowNode(
      connection,
      {
        workflowId: workflow.id,
        workflowNodeId: node.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNode);
  TestValidator.equals(
    "updated workflow node name",
    updatedNode.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated workflow node node_type",
    updatedNode.node_type,
    updateBody.node_type,
  );
  TestValidator.equals(
    "updated email_to_template",
    updatedNode.email_to_template,
    updateBody.email_to_template,
  );
  TestValidator.equals(
    "updated email_subject_template",
    updatedNode.email_subject_template,
    updateBody.email_subject_template,
  );
  TestValidator.equals(
    "updated email_body_template",
    updatedNode.email_body_template,
    updateBody.email_body_template,
  );
  TestValidator.equals(
    "updated sms_to_template",
    updatedNode.sms_to_template,
    updateBody.sms_to_template,
  );
  TestValidator.equals(
    "updated sms_body_template",
    updatedNode.sms_body_template,
    updateBody.sms_body_template,
  );
}
