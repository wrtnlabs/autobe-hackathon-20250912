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
 * End-to-end test validating the update of a workflow edge by changing its
 * from_node_id and to_node_id within the same workflow.
 *
 * This test covers the complete process:
 *
 * 1. Authentication as workflowManager
 * 2. Creating a new workflow
 * 3. Creating two workflow nodes
 * 4. Creating an initial workflow edge between the two nodes
 * 5. Updating that edge to swap the connected node IDs
 * 6. Verifying the update is successful
 *
 * All actions respect the domain constraints, use exact DTO types, and
 * perform strict type validation via typia.assert. The test ensures API
 * calls are awaited properly and business logic validations are made using
 * TestValidator.
 *
 * This ensures the workflow edge update maintains DAG integrity without
 * cycles or self-loops.
 */
export async function test_api_workflow_workflowedge_update(
  connection: api.IConnection,
) {
  // 1. Authenticate as workflowManager user
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  // Use a fixed hash or some realistic placeholder for password_hash
  const passwordHash = RandomGenerator.alphaNumeric(64); // Simulate hashed password

  const authorizedManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: managerEmail,
        password_hash: passwordHash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(authorizedManager);

  // 2. Create new workflow with temporary entry_node_id as UUID
  const tempEntryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    is_active: true,
    entry_node_id: tempEntryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);
  TestValidator.equals(
    "workflow created code matches",
    workflow.code,
    workflowCreateBody.code,
  );

  // 3. Create two workflow nodes in the workflow
  const node1Body = {
    workflow_id: workflow.id,
    node_type: "email",
    name: "Node 1",
    email_to_template: "{{user.email}}",
    email_subject_template: "Subject 1",
    email_body_template: "Hello User 1",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node1: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: node1Body },
    );
  typia.assert(node1);
  TestValidator.equals(
    "node1 workflow_id matches",
    node1.workflow_id,
    workflow.id,
  );

  const node2Body = {
    workflow_id: workflow.id,
    node_type: "sms",
    name: "Node 2",
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: "{{user.mobile}}",
    sms_body_template: "Text message",
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node2: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: node2Body },
    );
  typia.assert(node2);
  TestValidator.equals(
    "node2 workflow_id matches",
    node2.workflow_id,
    workflow.id,
  );

  // 4. Create initial workflow edge from node1 to node2
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

  TestValidator.equals(
    "edge workflow_id matches",
    edge.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "edge from_node_id matches node1",
    edge.from_node_id,
    node1.id,
  );
  TestValidator.equals(
    "edge to_node_id matches node2",
    edge.to_node_id,
    node2.id,
  );

  // 5. Update the edge to swap from_node_id and to_node_id
  const edgeUpdateBody = {
    from_node_id: node2.id,
    to_node_id: node1.id,
    workflow_id: workflow.id, // optionally set explicitly for update
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

  // 6. Validate that the update swapped the node IDs
  TestValidator.equals(
    "updated edge workflow_id matches",
    updatedEdge.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "updated edge from_node_id matches node2",
    updatedEdge.from_node_id,
    node2.id,
  );
  TestValidator.equals(
    "updated edge to_node_id matches node1",
    updatedEdge.to_node_id,
    node1.id,
  );
}
