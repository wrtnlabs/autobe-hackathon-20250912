import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * This test function verifies the successful deletion of a workflow node by
 * a workflow manager.
 *
 * The test covers the full user journey:
 *
 * 1. Create and authenticate a workflow manager user.
 * 2. Create a notification workflow with all required fields.
 * 3. Create a workflow node attached to the created workflow.
 * 4. Delete the created workflow node by specifying workflowId and
 *    workflowNodeId.
 *
 * Each step validates the API response to ensure data integrity and correct
 * API behaviour. Deletion is validated by the completion without error and
 * no data returned.
 *
 * This comprehensive test ensures authorization, data creation, and
 * deletion workflows operate correctly for the workflow manager role.
 */
export async function test_api_workflow_manager_workflow_node_delete_successful(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new workflow manager user
  const userBody = {
    email: `user${Date.now()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;
  const user: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: userBody,
    });
  typia.assert(user);

  // 2. Create a notification workflow
  const workflowBody = {
    code: `wf_${RandomGenerator.alphaNumeric(8)}`,
    is_active: true,
    name: `Test Workflow ${RandomGenerator.alphaNumeric(4)}`,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
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

  // 3. Create a workflow node within the created workflow
  const nodeCreate: INotificationWorkflowWorkflowNode.ICreate = {
    workflow_id: workflow.id,
    node_type: "Email",
    name: `Node ${RandomGenerator.alphaNumeric(4)}`,
    email_to_template: "{{ user.email }}",
    email_subject_template: "Test Subject",
    email_body_template: "Hello {{ user.name }}",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  };
  const node: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: nodeCreate,
      },
    );
  typia.assert(node);

  // 4. Delete the created workflow node using workflowId and workflowNodeId
  await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.eraseWorkflowNode(
    connection,
    {
      workflowId: workflow.id,
      workflowNodeId: node.id,
    },
  );
}
