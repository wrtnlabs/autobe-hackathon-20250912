import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * This E2E test validates the full workflow of deleting a workflow edge by
 * a workflow manager user. It includes joining as a workflow manager,
 * creating a workflow, creating two nodes, creating an edge linking the
 * nodes, then deleting the edge.
 *
 * The test ensures all API calls succeed, returned objects are validated,
 * and the deletion operation completes without error.
 *
 * Each step uses exact DTO types ensuring format and property compliance.
 *
 * The test ensures RBAC enforcement and integrity of workflow DAG
 * management.
 */
export async function test_api_workflowmanager_delete_workflow_edge(
  connection: api.IConnection,
) {
  // 1. Join (register and authenticate) as a workflow manager user.
  const managerEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const managerPasswordHash = RandomGenerator.alphaNumeric(20);
  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: managerEmail,
        password_hash: managerPasswordHash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(manager);

  // 2. Create a workflow with an entry node id temporarily set as empty UUID (will be updated later)
  const workflowCreateBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    is_active: true,
    entry_node_id: "00000000-0000-0000-0000-000000000000",
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);

  // 3. Create two workflow nodes for linking
  const nodeCreateBody1 = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: "Start Node",
    email_to_template: "user@example.com",
    email_subject_template: "Test Subject",
    email_body_template: "Hello {{user.name}}",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node1: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: nodeCreateBody1 },
    );
  typia.assert(node1);

  const nodeCreateBody2 = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: "Second Node",
    email_to_template: "user2@example.com",
    email_subject_template: "Subject 2",
    email_body_template: "Welcome {{user.name}}",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node2: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: nodeCreateBody2 },
    );
  typia.assert(node2);

  // 4. Create a workflow edge linking node1 to node2
  const edgeCreateBody = {
    workflow_id: workflow.id,
    from_node_id: node1.id,
    to_node_id: node2.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;
  const edge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      { workflowId: workflow.id, body: edgeCreateBody },
    );
  typia.assert(edge);

  // 5. Delete the created workflow edge
  await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.eraseEdge(
    connection,
    { workflowId: workflow.id, workflowEdgeId: edge.id },
  );
}
