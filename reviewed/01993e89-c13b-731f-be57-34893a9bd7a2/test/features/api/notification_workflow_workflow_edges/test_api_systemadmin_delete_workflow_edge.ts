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
 * Test scenario for deleting a workflow edge by system administrator.
 *
 * This test covers the full lifecycle of a workflow edge management by a system
 * admin:
 *
 * - System admin user registration and authentication
 * - Creating a workflow with an entry node id
 * - Creating two nodes within the workflow
 * - Creating an edge connecting the two nodes
 * - Deleting the created edge
 * - Confirming deletion by trying to delete it again, expecting a failure
 *
 * It validates correct authorization, resource creation, deletion and
 * restrictions.
 */
export async function test_api_systemadmin_delete_workflow_edge(
  connection: api.IConnection,
) {
  // 1. System admin signs up and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "abcd1234",
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(admin);

  // 2. Create a workflow - use dummy entry_node_id already
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: `Workflow ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`,
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);

  // 3. Create two workflow nodes for the edge
  const nodeCreateBody1 = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: `Node 1 ${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 })}`,
    email_to_template: `{{email1-${RandomGenerator.alphaNumeric(6)}}}@example.com`,
    email_subject_template: `Subject 1 - ${RandomGenerator.paragraph({ sentences: 1 })}`,
    email_body_template: RandomGenerator.content({ paragraphs: 1 }),
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node1: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: nodeCreateBody1 },
    );
  typia.assert(node1);

  const nodeCreateBody2 = {
    workflow_id: workflow.id,
    node_type: "SmsNode",
    name: `Node 2 ${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 })}`,
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: `+8210${RandomGenerator.alphaNumeric(8)}`,
    sms_body_template: RandomGenerator.paragraph({ sentences: 5 }),
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node2: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: nodeCreateBody2 },
    );
  typia.assert(node2);

  // 4. Create an edge connecting node1 and node2
  const edgeCreateBody = {
    workflow_id: workflow.id,
    from_node_id: node1.id,
    to_node_id: node2.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const edge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.createEdge(
      connection,
      { workflowId: workflow.id, body: edgeCreateBody },
    );
  typia.assert(edge);

  // 5. Delete the created workflow edge
  await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.eraseEdge(
    connection,
    {
      workflowId: workflow.id,
      workflowEdgeId: edge.id,
    },
  );

  // 6. Confirm deletion by attempting to delete again and expect error
  await TestValidator.error(
    "deleting the already deleted edge should fail",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.eraseEdge(
        connection,
        {
          workflowId: workflow.id,
          workflowEdgeId: edge.id,
        },
      );
    },
  );
}
