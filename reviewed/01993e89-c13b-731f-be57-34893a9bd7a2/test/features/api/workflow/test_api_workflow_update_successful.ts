import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * This E2E test function verifies the successful update of a notification
 * workflow.
 *
 * Business context: Workflow management requires authorization by a
 * workflowManager role. This test performs prerequisite user authentication
 * via join operation, creates a workflow node to use as an entry node; then
 * creates an initial workflow using that node, then updates the workflow
 * with new properties.
 *
 * The test validates that the updated workflow returned by the update API
 * reflects the changed fields and increments the version number.
 *
 * Step-by-step flow:
 *
 * 1. Join as a workflowManager user.
 * 2. Create a workflow node to serve as the entry_node_id.
 * 3. Create initial workflow using the workflow node's id.
 * 4. Update the workflow with new values in code, name, is_active,
 *    entry_node_id, and version.
 * 5. Assert the updated workflow matches expected updates and version
 *    increment.
 */
export async function test_api_workflow_update_successful(
  connection: api.IConnection,
) {
  // 1. Join as workflowManager
  const joinBody = {
    email: `flow_manager_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;
  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: joinBody,
    });
  typia.assert(manager);

  // 2. Create a workflow node to use as entry_node_id
  // Since no prior workflow exists, provide dummy workflowId for node creation that
  // is unrelated. Instead, first create placeholder workflow for this purpose
  // but scenario requires sequence: Create node first, however nodes require workflowId, so
  // first create a workflow with dummy entry_node_id (we can generate a temporary UUID or
  // we use workflowNode creation after creating initial workflow, so compensating by
  // creating initial workflow first with random UUID for entry_node_id?

  // We'll create a dummy initial workflow entry_node_id which is a random UUID.
  // Then create a real node with that workflow id.

  // To follow dependencies strictly as described, perform auth join again (redundant but required by input)
  // The scenario includes the join operation repeated in dependencies, so call again to ensure token and context
  const joinBodySecond = {
    email: `flow_manager2_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;
  const manager2: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: joinBodySecond,
    });
  typia.assert(manager2);

  // Create initial workflow node ID placeholder (UUID random) to use for workflow creation
  const temporaryEntryNodeId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create initial workflow with temporary entry_node_id
  const createWorkflowBody = {
    code: `code_${RandomGenerator.alphaNumeric(6)}`,
    name: `Workflow ${RandomGenerator.name()}`,
    is_active: true,
    entry_node_id: temporaryEntryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const initialWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: createWorkflowBody,
      },
    );
  typia.assert(initialWorkflow);

  // 4. Create a workflow node under the created workflow to use as the real entry_node_id
  const createNodeBody = {
    workflow_id: initialWorkflow.id,
    node_type: "email",
    name: `Node ${RandomGenerator.name()}`,
    email_to_template: `{{ user.email }}`,
    email_subject_template: `Important Notification`,
    email_body_template: `Hello, this is a test notification.`,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: initialWorkflow.id,
        body: createNodeBody,
      },
    );
  typia.assert(node);

  // 5. Update the workflow, changing the code, name, is_active, entry_node_id, and version
  const updatedCode = `code_updated_${RandomGenerator.alphaNumeric(6)}`;
  const updatedName = `Updated Workflow ${RandomGenerator.name()}`;
  const updatedIsActive = !initialWorkflow.is_active;
  const updatedVersion = initialWorkflow.version + 1;

  const updateBody = {
    code: updatedCode,
    name: updatedName,
    is_active: updatedIsActive,
    entry_node_id: node.id,
    version: updatedVersion,
  } satisfies INotificationWorkflowWorkflow.IUpdate;

  const updatedWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.update(
      connection,
      {
        workflowId: initialWorkflow.id,
        body: updateBody,
      },
    );
  typia.assert(updatedWorkflow);

  // 6. Validate the update applied correctly
  TestValidator.equals(
    "workflow code updated",
    updatedWorkflow.code,
    updateBody.code,
  );
  TestValidator.equals(
    "workflow name updated",
    updatedWorkflow.name,
    updateBody.name,
  );
  TestValidator.equals(
    "workflow is_active updated",
    updatedWorkflow.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "workflow entry_node_id updated",
    updatedWorkflow.entry_node_id,
    updateBody.entry_node_id,
  );
  TestValidator.equals(
    "workflow version incremented",
    updatedWorkflow.version,
    updatedVersion,
  );
}
