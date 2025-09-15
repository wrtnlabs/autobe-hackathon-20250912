import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * This E2E test validates that a system administrator can successfully create a
 * workflow edge for a specified workflow. The test scenario begins with
 * creating a system admin user, then creating a workflow, followed by creating
 * two workflow nodes that will be connected by the edge. Finally, the system
 * admin creates the workflow edge linking these nodes. The test confirms
 * correct workflow edge creation and verifies all edge attributes in the
 * response match the input values. This ensures that system administrators can
 * manage workflow edge topology securely and correctly.
 */
export async function test_api_workflow_systemadmin_workflow_edge_create_success(
  connection: api.IConnection,
) {
  // 1. Register system admin user and authenticate
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "Password123!",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(systemAdmin);

  // 2. Create new notification workflow
  // For entry_node_id, initially use a temporary UUID which will be replaced after node creation
  const tempEntryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    is_active: true,
    entry_node_id: tempEntryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);

  // 3. Create first workflow node within the workflow
  const firstNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "Email",
    name: "First Node",
    email_to_template: "{{ user.email }}",
    email_subject_template: "Welcome!",
    email_body_template: "Hello {{ user.name }}",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const firstNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: firstNodeCreateBody,
      },
    );
  typia.assert(firstNode);

  // 4. Create second workflow node within the workflow
  const secondNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "Email",
    name: "Second Node",
    email_to_template: "{{ user.email }}",
    email_subject_template: "Next Step",
    email_body_template: "This is the next step.",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const secondNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: secondNodeCreateBody,
      },
    );
  typia.assert(secondNode);

  // 5. Now update the workflow entry_node_id if it was a temporary placeholder
  // However, the API doesn't provide a workflow update endpoint in given materials,
  // so this step is skipped. The entry_node_id remains as initially set.

  // 6. Create the workflow edge linking firstNode to secondNode
  const edgeCreateBody = {
    workflow_id: workflow.id,
    from_node_id: firstNode.id,
    to_node_id: secondNode.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const workflowEdge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: workflow.id,
        body: edgeCreateBody,
      },
    );
  typia.assert(workflowEdge);

  // 7. Validate that the edge response matches the input
  TestValidator.equals(
    "workflowEdge.workflow_id matches workflow id",
    workflowEdge.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "workflowEdge.from_node_id matches firstNode id",
    workflowEdge.from_node_id,
    firstNode.id,
  );
  TestValidator.equals(
    "workflowEdge.to_node_id matches secondNode id",
    workflowEdge.to_node_id,
    secondNode.id,
  );
}
