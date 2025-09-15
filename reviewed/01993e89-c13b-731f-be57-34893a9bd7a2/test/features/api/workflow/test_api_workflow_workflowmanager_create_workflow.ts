import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * Validates end-to-end workflow creation by workflowManager user.
 *
 * This involves user registration (join), creation of workflow node, and
 * creation of workflow referencing the node as entry node.
 *
 * Steps:
 *
 * 1. Create workflow manager user by join authentication
 * 2. Create a workflow node with dummy workflow_id since workflow is not
 *    created yet
 * 3. Create the actual workflow with entry_node_id set to the created node's
 *    id
 * 4. Assert that all responses match expected types and business rules
 */
export async function test_api_workflow_workflowmanager_create_workflow(
  connection: api.IConnection,
) {
  // 1. Join workflowManager user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(128);
  const authorizedUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: userEmail,
        password_hash: passwordHash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Create a workflow node with dummy workflow_id (temporary UUID)
  const dummyWorkflowId: string = typia.random<string & tags.Format<"uuid">>();
  const nodeCreateBody: INotificationWorkflowWorkflowNode.ICreate = {
    workflow_id: dummyWorkflowId,
    node_type: "EmailNode",
    name: "Entry Node",
    email_to_template: "{{ user.email }}",
    email_subject_template: "Welcome to the workflow!",
    email_body_template: "Hello {{ user.name }}, welcome.",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  };
  const createdNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: dummyWorkflowId,
        body: nodeCreateBody,
      },
    );
  typia.assert(createdNode);

  // 3. Create a workflow with entry_node_id set to created node's id
  const workflowCreateBody: INotificationWorkflowWorkflow.ICreate = {
    code: `wf_${RandomGenerator.alphaNumeric(10)}`,
    name: "Test Workflow",
    is_active: true,
    entry_node_id: createdNode.id,
    version: 1,
  };
  const createdWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(createdWorkflow);

  // 4. Assertions of business rule compliance
  TestValidator.equals(
    "workflow code matches request",
    createdWorkflow.code,
    workflowCreateBody.code,
  );
  TestValidator.equals(
    "workflow name matches request",
    createdWorkflow.name,
    workflowCreateBody.name,
  );
  TestValidator.equals(
    "workflow activation status is true",
    createdWorkflow.is_active,
    true,
  );
  TestValidator.equals(
    "workflow entry_node_id matches node id",
    createdWorkflow.entry_node_id,
    createdNode.id,
  );
  TestValidator.equals("workflow version is 1", createdWorkflow.version, 1);
}
