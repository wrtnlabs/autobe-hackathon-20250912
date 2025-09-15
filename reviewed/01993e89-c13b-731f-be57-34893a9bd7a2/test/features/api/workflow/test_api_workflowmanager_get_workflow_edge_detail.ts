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
 * Validates workflow edge detail retrieval by a workflow manager user.
 *
 * This test confirms the full workflow involving:
 *
 * 1. Joining as a 'workflowManager' user for establishing authenticated
 *    context.
 * 2. Creating a new notification workflow with a designated entry node.
 * 3. Creating two distinct workflow nodes within that workflow.
 * 4. Creating a workflow edge connecting those two nodes.
 * 5. Retrieving the workflow edge details by workflow ID and edge ID.
 *
 * Each step asserts the correctness of returned data including IDs and
 * timestamps. The test ensures that the API returns the expected edge data
 * and that the workflow manager's permissions allow for these operations.
 *
 * Business context: Workflow edges define the transitions between nodes in
 * the notification workflow DAG. Accurate retrieval and creation of these
 * edges is critical for workflow orchestration and validation in the
 * management interface.
 *
 * This test simulates real user interaction with roles and resource
 * dependencies, handling sequential API calls, authenticating role
 * switches, and validating response data integrity.
 */
export async function test_api_workflowmanager_get_workflow_edge_detail(
  connection: api.IConnection,
) {
  // 1. Join as a workflowManager user to authenticate
  const workflowManagerUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const workflowManagerUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: workflowManagerUserEmail,
        password_hash: RandomGenerator.alphaNumeric(32), // random 32-char hash-like string
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(workflowManagerUser);

  // 2. Create a minimal workflow with entry node
  // We'll need an entry_node_id after creating node, so first create a node and use that node ID
  // But per API, workflow create requires entry_node_id upfront. As a test, we can create the workflow first with dummy entry_node_id, then create nodes, then update workflow?
  // However, the scenario implies: create workflow with entry node, so we need one node before creating workflow.
  // Since we cannot create node without existing workflowId, so cyclic dependency.
  // Therefore, we will create workflow first with entry_node_id as a randomly generated uuid (not yet used), create nodes, then create edge.

  const dummyEntryNodeId = typia.random<string & tags.Format<"uuid">>();

  const workflowCreationBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
    entry_node_id: dummyEntryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const createdWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreationBody,
      },
    );
  typia.assert(createdWorkflow);

  // 3. Create two nodes for the workflow

  // Create first node
  const node1CreateBody = {
    workflow_id: createdWorkflow.id,
    node_type: "EmailNode",
    name: RandomGenerator.paragraph({ sentences: 2 }),
    email_to_template: "{{ user.email }}",
    email_subject_template: "Welcome",
    email_body_template: "Hello {{ user.name }}",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const createdNode1: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: createdWorkflow.id,
        body: node1CreateBody,
      },
    );
  typia.assert(createdNode1);

  // Create second node
  const node2CreateBody = {
    workflow_id: createdWorkflow.id,
    node_type: "DelayNode",
    name: RandomGenerator.paragraph({ sentences: 2 }),
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: 60000, // 1 min delay
    delay_duration: "PT1M",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const createdNode2: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: createdWorkflow.id,
        body: node2CreateBody,
      },
    );
  typia.assert(createdNode2);

  // 4. Create a workflow edge connecting the two nodes
  const edgeCreateBody = {
    workflow_id: createdWorkflow.id,
    from_node_id: createdNode1.id,
    to_node_id: createdNode2.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const createdEdge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: createdWorkflow.id,
        body: edgeCreateBody,
      },
    );
  typia.assert(createdEdge);

  // 5. Retrieve workflow edge detail
  const retrievedEdgeDetail: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.atWorkflowEdge(
      connection,
      {
        workflowId: createdWorkflow.id,
        workflowEdgeId: createdEdge.id,
      },
    );
  typia.assert(retrievedEdgeDetail);

  // Verify that retrieved edge ID and workflow ID matches created ones
  TestValidator.equals(
    "retrieved edge id matches created",
    retrievedEdgeDetail.id,
    createdEdge.id,
  );
  TestValidator.equals(
    "retrieved workflow id matches created",
    retrievedEdgeDetail.workflow_id,
    createdEdge.workflow_id,
  );
  TestValidator.equals(
    "retrieved edge from_node_id matches created",
    retrievedEdgeDetail.from_node_id,
    createdEdge.from_node_id,
  );
  TestValidator.equals(
    "retrieved edge to_node_id matches created",
    retrievedEdgeDetail.to_node_id,
    createdEdge.to_node_id,
  );

  // Verify timestamps are valid ISO8601 strings
  TestValidator.predicate(
    "created_at is ISO8601 date-time",
    typeof retrievedEdgeDetail.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        retrievedEdgeDetail.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO8601 date-time",
    typeof retrievedEdgeDetail.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        retrievedEdgeDetail.updated_at,
      ),
  );
}
