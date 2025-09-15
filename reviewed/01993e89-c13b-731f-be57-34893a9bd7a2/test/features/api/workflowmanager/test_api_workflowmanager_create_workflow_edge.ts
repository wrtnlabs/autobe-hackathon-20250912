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
 * Test scenario to create a new workflow edge by a workflow manager. The
 * scenario creates a workflow manager user for authentication, creates a
 * workflow with entry node, creates two workflow nodes to use as the source and
 * target of the edge, then creates the workflow edge connecting these nodes.
 * This verifies successful edge creation with proper RBAC and data flow.
 */
export async function test_api_workflowmanager_create_workflow_edge(
  connection: api.IConnection,
) {
  // Step 1. Create and authenticate a workflow manager user
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password_hash = RandomGenerator.alphaNumeric(64);

  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: email,
        password_hash: password_hash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(manager);

  // Step 2. Create a new workflow
  // Use a temporary entry_node_id UUID before creating node
  const entry_node_id = typia.random<string & tags.Format<"uuid">>();

  const code = `WF-${RandomGenerator.alphaNumeric(6)}`;
  const name = `Workflow ${RandomGenerator.name()}`;
  const version = 1;
  const is_active = true;

  const workflow_create_body = {
    code: code,
    name: name,
    is_active: is_active,
    entry_node_id: entry_node_id,
    version: version,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflow_create_body,
      },
    );
  typia.assert(workflow);

  // Step 3. Create source workflow node (entry node)
  const source_node_create_body = {
    workflow_id: workflow.id,
    node_type: "EntryNode",
    name: `Entry Node ${RandomGenerator.paragraph({ sentences: 2 })}`,
    email_to_template: "{{user.email}}",
    email_subject_template: "Welcome",
    email_body_template: "Hello {{user.name}}",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const source_node: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: source_node_create_body,
      },
    );
  typia.assert(source_node);

  // Step 4. Create target workflow node
  const target_node_create_body = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: `Target Node ${RandomGenerator.paragraph({ sentences: 2 })}`,
    email_to_template: "{{user.email}}",
    email_subject_template: "Notification",
    email_body_template: "You have an update, {{user.name}}",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const target_node: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: target_node_create_body,
      },
    );
  typia.assert(target_node);

  // Step 5. Create workflow edge
  const create_edge_body = {
    workflow_id: workflow.id,
    from_node_id: source_node.id,
    to_node_id: target_node.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const edge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: workflow.id,
        body: create_edge_body,
      },
    );
  typia.assert(edge);

  // Validate references
  TestValidator.equals(
    "workflow ID should match edge.workflow_id",
    edge.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "edge from_node_id should match source node ID",
    edge.from_node_id,
    source_node.id,
  );
  TestValidator.equals(
    "edge to_node_id should match target node ID",
    edge.to_node_id,
    target_node.id,
  );
}
