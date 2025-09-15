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
 * Validate the creation of a workflow edge by a system administrator.
 *
 * This test covers the complete workflow of setting up a notification
 * workflow, including:
 *
 * 1. Creating and authenticating a system administrator user.
 * 2. Creating a new workflow with an entry node.
 * 3. Creating two workflow nodes associated with the workflow.
 * 4. Creating a workflow edge connecting the two nodes.
 *
 * Each step asserts API responses with typia.assert and validates business
 * logic with TestValidator to ensure successful creation and correct data
 * linkage.
 */
export async function test_api_systemadmin_create_workflow_edge(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a system administrator user
  const email = RandomGenerator.alphaNumeric(8) + "@example.com";
  const password = "strongPassword123!";
  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "system admin authenticated with access token",
    admin.token.access.length > 0,
  );

  // Step 2: Create a new workflow with an entry node ID
  // For entry_node_id, generate a dummy UUID as placeholder (no update API provided to fix it later)
  const dummyEntryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: "wf-" + RandomGenerator.alphaNumeric(4),
    name: "Test Workflow " + RandomGenerator.alphaNumeric(4),
    is_active: true,
    entry_node_id: dummyEntryNodeId,
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

  // Step 3: Create the source and target workflow nodes for the edge
  // Source node - Email type
  const sourceNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "Email",
    name: "Source Node",
    email_to_template: "{{ user.email }}",
    email_subject_template: "Welcome Email",
    email_body_template: "Hello {{ user.name }}, welcome!",
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

  // Target node - Sms type
  const targetNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "Sms",
    name: "Target Node",
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: "{{ user.mobile }}",
    sms_body_template: "Your code is 1234",
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

  // Step 4: Create workflow edge connecting sourceNode to targetNode
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

  // Step 5: Validation
  TestValidator.equals(
    "workflow edge belongs to the correct workflow",
    edge.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "workflow edge links correct from node",
    edge.from_node_id,
    sourceNode.id,
  );
  TestValidator.equals(
    "workflow edge links correct to node",
    edge.to_node_id,
    targetNode.id,
  );
}
