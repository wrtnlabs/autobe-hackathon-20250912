import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

export async function test_api_workflowmanager_update_workflow_edge(
  connection: api.IConnection,
) {
  // 1. Workflow manager user joins and authenticates
  const managerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;
  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Create workflow with entry node
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);

  // 3. Create source workflow node
  const sourceNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: RandomGenerator.name(),
    email_to_template: "{{ user.email }}",
    email_subject_template: "Subject",
    email_body_template: "Body content",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const sourceNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: sourceNodeCreateBody,
      },
    );
  typia.assert(sourceNode);

  // 4. Create target workflow node
  const targetNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "DelayNode",
    name: RandomGenerator.name(),
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: 60000,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const targetNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: targetNodeCreateBody,
      },
    );
  typia.assert(targetNode);

  // 5. Create initial workflow edge
  const edgeCreateBody = {
    workflow_id: workflow.id,
    from_node_id: sourceNode.id,
    to_node_id: targetNode.id,
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

  // 6. Update the workflow edge: swap source and target nodes
  const edgeUpdateBody = {
    from_node_id: targetNode.id,
    to_node_id: sourceNode.id,
  } satisfies INotificationWorkflowWorkflowEdge.IUpdate;

  const updatedEdge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.updateEdge(
      connection,
      {
        workflowId: workflow.id,
        workflowEdgeId: edge.id,
        body: edgeUpdateBody,
      },
    );
  typia.assert(updatedEdge);

  // 7. Validate the update has the expected changed nodes
  TestValidator.equals(
    "Workflow edge source node updated",
    updatedEdge.from_node_id,
    targetNode.id,
  );
  TestValidator.equals(
    "Workflow edge target node updated",
    updatedEdge.to_node_id,
    sourceNode.id,
  );
}
