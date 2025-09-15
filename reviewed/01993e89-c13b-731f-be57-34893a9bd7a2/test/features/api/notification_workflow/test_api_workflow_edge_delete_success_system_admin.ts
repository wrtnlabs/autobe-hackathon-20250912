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
 * This scenario tests successful deletion of a workflow edge by a system
 * administrator user. It includes a full dependency chain where the system
 * admin is created and authenticated, a workflow is created, two workflow
 * nodes are inserted, and an edge connecting them is created. Subsequently,
 * the edge is deleted, verifying proper role-based access control and
 * ensuring the edge is permanently removed from the workflow. This ensures
 * that system administrators can maintain the integrity and structure of
 * workflows.
 */
export async function test_api_workflow_edge_delete_success_system_admin(
  connection: api.IConnection,
) {
  // 1. Create system admin user and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(sysAdmin);

  // 2. Create notification workflow
  // We must provide entry_node_id, but nodes don't exist at creation time.
  // Create workflow with dummy entry_node_id, then create nodes and edges.

  const dummyNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: `test-wf-${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    is_active: true,
    entry_node_id: dummyNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);

  // 3. Create entry node
  const entryNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: "Entry Node",
    email_to_template: "{{user.email}}",
    email_subject_template: "Welcome to our workflow",
    email_body_template: "Hello {{user.name}}, welcome!",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const entryNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: entryNodeCreateBody,
      },
    );
  typia.assert(entryNode);

  // 4. Create second node
  const targetNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: "Target Node",
    email_to_template: "{{user.email}}",
    email_subject_template: "Follow-up Message",
    email_body_template: "Please check your profile update.",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const targetNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: targetNodeCreateBody,
      },
    );
  typia.assert(targetNode);

  // 5. Create edge between entryNode and targetNode
  const edgeCreateBody = {
    workflow_id: workflow.id,
    from_node_id: entryNode.id,
    to_node_id: targetNode.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const edge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: workflow.id,
        body: edgeCreateBody,
      },
    );
  typia.assert(edge);

  // 6. Delete the edge
  await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.eraseEdge(
    connection,
    {
      workflowId: workflow.id,
      workflowEdgeId: edge.id,
    },
  );

  // 7. Validate deletion by attempting to create the same edge again (should succeed)
  const newEdge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: workflow.id,
        body: edgeCreateBody,
      },
    );
  typia.assert(newEdge);

  // 8. Delete the newly created edge to clean up
  await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.eraseEdge(
    connection,
    {
      workflowId: workflow.id,
      workflowEdgeId: newEdge.id,
    },
  );

  // All tests passed successfully
}
