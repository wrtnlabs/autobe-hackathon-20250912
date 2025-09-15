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
 * Test deleting a workflow edge in a notification workflow.
 *
 * Workflow:
 *
 * 1. Join as workflow manager user.
 * 2. Create a new workflow.
 * 3. Create two workflow nodes for the workflow.
 * 4. Create a workflow edge connecting the two nodes.
 * 5. Delete the created workflow edge.
 * 6. Confirm successful deletion without errors.
 */
export async function test_api_workflow_workflowedge_delete(
  connection: api.IConnection,
) {
  // 1. Join as workflow manager user
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: managerEmail,
        password_hash: "hashed_password_1234",
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(manager);

  // 2. Create a new workflow with a placeholder entry_node_id since no update is provided
  const workflowCode = RandomGenerator.alphaNumeric(10);
  const workflowName = RandomGenerator.name(3);
  const initialEntryNodeId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const workflowCreateBody = {
    code: workflowCode,
    name: workflowName,
    is_active: true,
    version: 1,
    entry_node_id: initialEntryNodeId,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);
  TestValidator.equals(
    "workflow code matches",
    workflow.code,
    workflowCreateBody.code,
  );
  TestValidator.equals(
    "workflow name matches",
    workflow.name,
    workflowCreateBody.name,
  );
  TestValidator.predicate("workflow is active", workflow.is_active === true);

  // 3. Create two workflow nodes
  const node1CreateBody = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: RandomGenerator.name(2),
    email_to_template: "{{ user.email }}",
    email_subject_template: "Subject 1",
    email_body_template: "Body of email 1",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const node1: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: node1CreateBody,
      },
    );
  typia.assert(node1);
  TestValidator.equals(
    "node1.workflow_id matches",
    node1.workflow_id,
    workflow.id,
  );
  TestValidator.equals("node1.name matches", node1.name, node1CreateBody.name);
  TestValidator.equals(
    "node1.node_type matches",
    node1.node_type,
    node1CreateBody.node_type,
  );

  const node2CreateBody = {
    workflow_id: workflow.id,
    node_type: "DelayNode",
    name: RandomGenerator.name(2),
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: 60000,
    delay_duration: "PT1M",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const node2: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: node2CreateBody,
      },
    );
  typia.assert(node2);
  TestValidator.equals(
    "node2.workflow_id matches",
    node2.workflow_id,
    workflow.id,
  );
  TestValidator.equals("node2.name matches", node2.name, node2CreateBody.name);
  TestValidator.equals(
    "node2.node_type matches",
    node2.node_type,
    node2CreateBody.node_type,
  );

  // 4. Create a workflow edge connecting the two nodes
  const edgeCreateBody = {
    workflow_id: workflow.id,
    from_node_id: node1.id,
    to_node_id: node2.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const edge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: workflow.id,
        body: edgeCreateBody,
      },
    );
  typia.assert(edge);
  TestValidator.equals(
    "edge.workflow_id matches",
    edge.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "edge.from_node_id matches",
    edge.from_node_id,
    node1.id,
  );
  TestValidator.equals("edge.to_node_id matches", edge.to_node_id, node2.id);

  // 5. Delete the created workflow edge
  await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.eraseEdge(
    connection,
    {
      workflowId: workflow.id,
      workflowEdgeId: edge.id,
    },
  );

  // 6. Confirm deletion succeeded by asserting no error thrown
}
