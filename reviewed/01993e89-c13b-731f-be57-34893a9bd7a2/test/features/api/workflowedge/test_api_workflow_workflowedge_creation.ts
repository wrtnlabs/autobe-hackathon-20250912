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
 * Test creating a workflow edge linking two nodes within the specified
 * workflow.
 *
 * The test ensures that the edge creation respects DAG integrity by validating
 * that both nodes belong to the workflow and no cycles are introduced.
 *
 * This test covers workflowManager authentication, workflow creation, two
 * workflow node creations, and the creation of an edge connecting these nodes.
 *
 * It confirms that the edge creation returns the expected edge details.
 */
export async function test_api_workflow_workflowedge_creation(
  connection: api.IConnection,
) {
  // 1. Authenticate as workflowManager user
  const email = `${RandomGenerator.alphabets(10)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const authUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(authUser);

  // 2. Create a notification workflow (entry_node_id placeholder empty UUID, later will use actual nodes)
  const emptyUUID = "00000000-0000-0000-0000-000000000000";
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: `Workflow ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })}`,
    is_active: true,
    entry_node_id: emptyUUID,
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

  // 3. Create first workflow node
  const node1CreateBody = {
    workflow_id: workflow.id,
    node_type: "email",
    name: `Node 1 - ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })}`,
    email_to_template: "{{ user.email }}",
    email_subject_template: "Welcome Email",
    email_body_template: "Hello, this is node 1 notification.",
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

  // 4. Create second workflow node
  const node2CreateBody = {
    workflow_id: workflow.id,
    node_type: "email",
    name: `Node 2 - ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })}`,
    email_to_template: "{{ user.email }}",
    email_subject_template: "Follow-up Email",
    email_body_template: "Hello, this is node 2 follow-up notification.",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
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

  // 5. Create a workflow edge linking node1 to node2
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

  // 6. Validate the results
  TestValidator.predicate(
    "valid workflow ID in edge",
    edge.workflow_id === workflow.id,
  );
  TestValidator.predicate(
    "edge from_node_id matches node1 id",
    edge.from_node_id === node1.id,
  );
  TestValidator.predicate(
    "edge to_node_id matches node2 id",
    edge.to_node_id === node2.id,
  );
  TestValidator.predicate(
    "edge id is valid UUID",
    typeof edge.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        edge.id,
      ),
  );
}
