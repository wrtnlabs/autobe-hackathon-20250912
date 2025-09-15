import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * This test performs an end-to-end creation of a workflow node by a
 * workflow manager user.
 *
 * The workflow manager user is first created via the join API,
 * authenticating the session. Then, a base workflow node is created to
 * obtain a valid entry_node_id. Using this entry_node_id, a notification
 * workflow is created.
 *
 * Subsequently, a new workflow node is created under this workflow with
 * type "email" and with defined LiquidJS templates.
 *
 * At each stage, typia.assert() is called for full validation.
 *
 * The test checks that responses contain valid identifiers and timestamps
 * as expected by schemas.
 *
 * This ensures that workflow manager capabilities for notification
 * workflows and nodes are correctly functioning, adhering to business logic
 * and API contract.
 */
export async function test_api_workflow_manager_workflow_nodes_create_successful(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate workflow manager user
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword: string = RandomGenerator.alphaNumeric(12);
  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: managerEmail,
        password_hash: managerPassword,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(manager);

  // Step 2: Create a base workflow node to get a valid entry_node_id
  // Create a dummy workflow ID (UUID) to link the base node temporarily
  // We'll create the workflow later using this node ID
  const dummyWorkflowId = typia.random<string & tags.Format<"uuid">>();

  const baseNodeBody = {
    workflow_id: dummyWorkflowId,
    node_type: "email",
    name: "Base Node",
    email_to_template: "{{user.email}}",
    email_subject_template: "Base Node Subject",
    email_body_template: "Base Node Body",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const baseNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: dummyWorkflowId,
        body: baseNodeBody,
      },
    );
  typia.assert(baseNode);

  // Step 3: Create a notification workflow using the base workflow node ID as entry_node_id
  const workflowBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: "Test Notification Workflow",
    is_active: true,
    entry_node_id: baseNode.id,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowBody,
      },
    );
  typia.assert(workflow);

  // Step 4: Create a new workflow node under the created workflow with email templates
  const newNodeBody = {
    workflow_id: workflow.id,
    node_type: "email",
    name: "Welcome Email Node",
    email_to_template: "{{ user.email }}",
    email_subject_template: "Welcome to Our Service!",
    email_body_template: "Hello {{ user.name }}, thank you for joining!",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const newNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: newNodeBody,
      },
    );
  typia.assert(newNode);

  // Step 5: Validate that the new node has all expected properties, including id and timestamps
  TestValidator.predicate(
    "new node has id",
    typeof newNode.id === "string" && newNode.id.length > 0,
  );
  TestValidator.equals(
    "new node workflow_id",
    newNode.workflow_id,
    workflow.id,
  );
  TestValidator.equals("new node node_type", newNode.node_type, "email");
  TestValidator.equals("new node name", newNode.name, "Welcome Email Node");
  TestValidator.predicate(
    "new node has created_at",
    typeof newNode.created_at === "string" && newNode.created_at.length > 0,
  );
  TestValidator.predicate(
    "new node has updated_at",
    typeof newNode.updated_at === "string" && newNode.updated_at.length > 0,
  );
  TestValidator.equals(
    "new node email_to_template",
    newNode.email_to_template,
    "{{ user.email }}",
  );
  TestValidator.equals(
    "new node email_subject_template",
    newNode.email_subject_template,
    "Welcome to Our Service!",
  );
  TestValidator.equals(
    "new node email_body_template",
    newNode.email_body_template,
    "Hello {{ user.name }}, thank you for joining!",
  );
  TestValidator.equals(
    "new node sms_to_template",
    newNode.sms_to_template,
    null,
  );
  TestValidator.equals(
    "new node sms_body_template",
    newNode.sms_body_template,
    null,
  );
  TestValidator.equals("new node delay_ms", newNode.delay_ms, null);
  TestValidator.equals("new node delay_duration", newNode.delay_duration, null);
}
