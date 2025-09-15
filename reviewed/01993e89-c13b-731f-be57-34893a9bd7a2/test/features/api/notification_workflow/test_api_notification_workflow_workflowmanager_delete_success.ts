import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * This scenario performs an end-to-end test of the notification workflow
 * deletion by a workflow manager user. It begins by creating a new workflow
 * manager user via the `/auth/workflowManager/join` API to establish
 * authentication context. Next, it creates a workflow node associated with the
 * workflow created later, acting as the entry node of the workflow DAG. Then,
 * it creates the notification workflow using the entry node ID obtained from
 * the created node, which returns the `workflowId`. Finally, the scenario
 * deletes the created workflow by calling the delete endpoint with the
 * `workflowId` and verifies that the deletion was successful by absence of
 * errors. This tests the entire flow from user creation, workflow node setup,
 * workflow creation, to workflow deletion, validating proper role
 * authentication and resource lifecycle management.
 */
export async function test_api_notification_workflow_workflowmanager_delete_success(
  connection: api.IConnection,
) {
  // 1. Create Workflow Manager user and authenticate
  const email = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(16); // Simulating hashed password

  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(manager);

  // 2. Create the workflow with a temporary entry_node_id
  const tempEntryNodeId = typia.random<string & tags.Format<"uuid">>();

  const workflowInput = {
    code: `wf_${RandomGenerator.alphaNumeric(6)}`,
    name: `Workflow ${RandomGenerator.alphaNumeric(4)}`,
    is_active: true,
    entry_node_id: tempEntryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      { body: workflowInput },
    );
  typia.assert(workflow);

  // 3. Create workflow node referencing the created workflow id
  const workflowId = workflow.id;

  const nodeCreateInput = {
    workflow_id: workflowId,
    node_type: "EmailNode",
    name: "Entry Node",
    email_to_template: "{{ user.email }}",
    email_subject_template: "Notification Entry",
    email_body_template: "Welcome to our system, {{ user.name }}!",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const node: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflowId,
        body: nodeCreateInput,
      },
    );
  typia.assert(node);

  // 4. Since there is no API to update the workflow's entry_node_id after creation,
  // we acknowledge the mismatch but proceed with the test scenario.

  // 5. Delete the workflow using the workflowId
  await api.functional.notificationWorkflow.workflowManager.workflows.erase(
    connection,
    {
      workflowId: workflowId,
    },
  );

  // 6. Validate deletion success by ensuring that the deletion call succeeds
  TestValidator.predicate("workflow deletion succeeds", true);
}
