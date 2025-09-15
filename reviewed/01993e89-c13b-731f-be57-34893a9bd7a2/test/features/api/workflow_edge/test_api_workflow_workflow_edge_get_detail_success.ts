import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

export async function test_api_workflow_workflow_edge_get_detail_success(
  connection: api.IConnection,
) {
  // 1. System Admin join and login
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = RandomGenerator.alphaNumeric(12);

  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      password: systemAdminPassword,
    } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
  });
  typia.assert(systemAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password: systemAdminPassword,
    } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
  });

  // 2. Create a workflow
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const createRequestBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: createRequestBody,
      },
    );
  typia.assert(workflow);

  // 3. Workflow Manager join and login
  const workflowManagerEmail = typia.random<string & tags.Format<"email">>();
  const workflowManagerPassword = RandomGenerator.alphaNumeric(12);

  const workflowManager = await api.functional.auth.workflowManager.join(
    connection,
    {
      body: {
        email: workflowManagerEmail,
        password_hash: workflowManagerPassword,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    },
  );
  typia.assert(workflowManager);

  await api.functional.auth.workflowManager.login(connection, {
    body: {
      email: workflowManagerEmail,
      password: workflowManagerPassword,
    } satisfies INotificationWorkflowWorkflowManager.ILogin,
  });

  // 4. Create from-node
  const fromNodeRequestBody = {
    workflow_id: workflow.id,
    node_type: RandomGenerator.pick(["Email", "SMS", "Delay"] as const),
    name: RandomGenerator.name(),
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const fromNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: fromNodeRequestBody,
      },
    );
  typia.assert(fromNode);

  // 5. Create to-node
  const toNodeRequestBody = {
    workflow_id: workflow.id,
    node_type: RandomGenerator.pick(["Email", "SMS", "Delay"] as const),
    name: RandomGenerator.name(),
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const toNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: toNodeRequestBody,
      },
    );
  typia.assert(toNode);

  // 6. Create edge connecting from-node to to-node
  const edgeRequestBody = {
    workflow_id: workflow.id,
    from_node_id: fromNode.id,
    to_node_id: toNode.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const edge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: workflow.id,
        body: edgeRequestBody,
      },
    );
  typia.assert(edge);

  // 7. Get edge details and validate
  const fetchedEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.atWorkflowEdge(
      connection,
      {
        workflowId: workflow.id,
        workflowEdgeId: edge.id,
      },
    );
  typia.assert(fetchedEdge);

  TestValidator.equals("Edge ID matches", fetchedEdge.id, edge.id);
  TestValidator.equals(
    "Edge workflow ID matches",
    fetchedEdge.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "From node ID matches",
    fetchedEdge.from_node_id,
    fromNode.id,
  );
  TestValidator.equals("To node ID matches", fetchedEdge.to_node_id, toNode.id);
  TestValidator.predicate(
    "Created at timestamp exists",
    typeof fetchedEdge.created_at === "string",
  );
  TestValidator.predicate(
    "Updated at timestamp exists",
    typeof fetchedEdge.updated_at === "string",
  );
}
