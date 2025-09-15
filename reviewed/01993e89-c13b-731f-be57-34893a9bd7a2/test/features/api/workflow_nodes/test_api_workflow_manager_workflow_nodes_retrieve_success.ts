import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * Tests retrieving detailed information about a workflow node as a workflow
 * manager user.
 *
 * The test simulates the full scenario:
 *
 * 1. WorkflowManager user signs up and authenticates.
 * 2. Create a new notification workflow, generating a unique code and entry node.
 * 3. Create a workflow node within the workflow.
 * 4. Retrieve the workflow node details with the node id.
 *
 * Validates the exact property matching and existence of the retrieved node.
 * Ensures the retrieval API returns consistent, correct data.
 *
 * This ensures the integrity and correctness of workflow node retrieval
 * operations for authorized workflow manager users.
 */
export async function test_api_workflow_manager_workflow_nodes_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Create new workflowManager user and authenticate
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32);

  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: managerEmail,
        password_hash: passwordHash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(manager);

  // 2. Create a new notification workflow without entry_node_id, since no update API
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
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

  // 3. Create a new workflow node within the created workflow
  const nodeCreateBodyRaw = {
    workflow_id: workflow.id,
    node_type: "email",
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 12 }),
    email_to_template: `{{ user.email }}`,
    email_subject_template: `Welcome, {{ user.name }}!`,
    email_body_template: `Hello {{ user.name }}, thank you for joining!`,
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const node: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: nodeCreateBodyRaw,
      },
    );
  typia.assert(node);

  // Verify id is valid UUID and node matches input properties
  TestValidator.predicate(
    "node.id is a UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      node.id,
    ),
  );
  TestValidator.equals(
    "node.workflow_id matches workflow id",
    node.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "node.node_type matches",
    node.node_type,
    nodeCreateBodyRaw.node_type,
  );
  TestValidator.equals("node.name matches", node.name, nodeCreateBodyRaw.name);

  // 4. Retrieve the workflow node details
  const retrievedNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.at(
      connection,
      {
        workflowId: workflow.id,
        workflowNodeId: node.id,
      },
    );
  typia.assert(retrievedNode);

  // Verify retrieved node matches created node exactly
  TestValidator.equals("retrieved node id", retrievedNode.id, node.id);
  TestValidator.equals(
    "retrieved node workflow_id",
    retrievedNode.workflow_id,
    node.workflow_id,
  );
  TestValidator.equals(
    "retrieved node node_type",
    retrievedNode.node_type,
    node.node_type,
  );
  TestValidator.equals("retrieved node name", retrievedNode.name, node.name);
  TestValidator.equals(
    "retrieved node email_to_template",
    retrievedNode.email_to_template,
    node.email_to_template,
  );
  TestValidator.equals(
    "retrieved node email_subject_template",
    retrievedNode.email_subject_template,
    node.email_subject_template,
  );
  TestValidator.equals(
    "retrieved node email_body_template",
    retrievedNode.email_body_template,
    node.email_body_template,
  );
  TestValidator.equals(
    "retrieved node sms_to_template",
    retrievedNode.sms_to_template,
    node.sms_to_template,
  );
  TestValidator.equals(
    "retrieved node sms_body_template",
    retrievedNode.sms_body_template,
    node.sms_body_template,
  );
  TestValidator.equals(
    "retrieved node delay_ms",
    retrievedNode.delay_ms,
    node.delay_ms,
  );
  TestValidator.equals(
    "retrieved node delay_duration",
    retrievedNode.delay_duration,
    node.delay_duration,
  );

  // Additional timestamp checks (just assert presence and format)
  TestValidator.predicate(
    "retrieved node created_at in ISO 8601",
    typeof retrievedNode.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(retrievedNode.created_at),
  );
  TestValidator.predicate(
    "retrieved node updated_at in ISO 8601",
    typeof retrievedNode.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(retrievedNode.updated_at),
  );
}
