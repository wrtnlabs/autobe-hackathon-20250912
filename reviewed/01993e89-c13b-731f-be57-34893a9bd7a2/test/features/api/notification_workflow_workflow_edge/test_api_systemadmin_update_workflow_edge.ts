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
 * Test scenario for updating a workflow edge by system administrator.
 *
 * This test covers the full business flow:
 *
 * 1. System administrator creation and authentication
 * 2. Workflow creation with an initial entry node
 * 3. Creation of source and target workflow nodes
 * 4. Creation of a workflow edge connecting the source and target nodes
 * 5. Creation of a new target node for edge update
 * 6. Updating the workflow edge to point to the new target node
 *
 * It validates the correct linkage and data integrity of workflow edges,
 * ensuring the update operation succeeds as expected.
 *
 * Each API response is asserted for type correctness and key fields are
 * validated to ensure proper update semantics.
 */
export async function test_api_systemadmin_update_workflow_edge(
  connection: api.IConnection,
) {
  // 1. System admin joins and authenticates
  const systemAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password: "StrongPassword123!",
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // 2. Create a workflow with initial entry node id as a new UUID
  const entryNodeId: string = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: `WF-${RandomGenerator.alphaNumeric(8)}`,
    name: "Test Workflow",
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);

  // 3. Create source workflow node
  const sourceNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "Email",
    name: "Source Node",
    email_to_template: "{{ user.email }}",
    email_subject_template: "Source Node Notification",
    email_body_template: "Welcome to source node",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const sourceNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
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
    node_type: "SMS",
    name: "Target Node",
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: "{{ user.mobile }}",
    sms_body_template: "Your SMS content here",
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

  // 5. Create initial edge connecting source node to target node
  const edgeCreateBody = {
    workflow_id: workflow.id,
    from_node_id: sourceNode.id,
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

  // 6. Now create a new node to update edge to point to
  const newTargetNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "Delay",
    name: "New Target Node",
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: 3000,
    delay_duration: "PT3S",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const newTargetNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: newTargetNodeCreateBody,
      },
    );
  typia.assert(newTargetNode);

  // 7. Update the edge to point from source node to new target node
  const edgeUpdateBody = {
    workflow_id: workflow.id,
    from_node_id: sourceNode.id,
    to_node_id: newTargetNode.id,
  } satisfies INotificationWorkflowWorkflowEdge.IUpdate;
  const updatedEdge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.updateEdge(
      connection,
      {
        workflowId: workflow.id,
        workflowEdgeId: edge.id,
        body: edgeUpdateBody,
      },
    );
  typia.assert(updatedEdge);

  // Validation: edge id unchanged, from_node_id unchanged, to_node_id updated
  TestValidator.equals(
    "updated edge id matches original",
    updatedEdge.id,
    edge.id,
  );
  TestValidator.equals(
    "updated edge from_node_id matches original",
    updatedEdge.from_node_id,
    edge.from_node_id,
  );
  TestValidator.equals(
    "updated edge to_node_id matches new node",
    updatedEdge.to_node_id,
    newTargetNode.id,
  );
}
