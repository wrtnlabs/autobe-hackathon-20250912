import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

export async function test_api_systemadmin_get_workflow_edge_detail(
  connection: api.IConnection,
) {
  // System Admin user registration and authentication
  const systemAdminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const systemAdminAuthorized: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password: "StrongPassw0rd!",
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdminAuthorized);

  // Create a new notification workflow with entry node id placeholder
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: `Test Workflow ${RandomGenerator.paragraph({ sentences: 2 })}`,
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

  // Create two workflow nodes for the workflow
  const workflowId = workflow.id;

  const node1CreateBody = {
    workflow_id: workflowId,
    node_type: "Email",
    name: "Email Node 1",
    email_to_template: "{{ user.email }}",
    email_subject_template: "Test Subject",
    email_body_template: "Hello, this is a test email.",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const node1: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflowId,
        body: node1CreateBody,
      },
    );
  typia.assert(node1);

  const node2CreateBody = {
    workflow_id: workflowId,
    node_type: "Delay",
    name: "Delay Node 2",
    delay_ms: 60000,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const node2: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflowId,
        body: node2CreateBody,
      },
    );
  typia.assert(node2);

  // Create a workflow edge connecting node1 to node2
  const edgeCreateBody = {
    workflow_id: workflowId,
    from_node_id: node1.id,
    to_node_id: node2.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const edge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: workflowId,
        body: edgeCreateBody,
      },
    );
  typia.assert(edge);

  // Retrieve the edge detail
  const edgeDetail: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowEdges.atWorkflowEdge(
      connection,
      {
        workflowId: workflowId,
        workflowEdgeId: edge.id,
      },
    );
  typia.assert(edgeDetail);

  // Validate retrieved edge matches created edge
  TestValidator.equals("workflow edge id matches", edgeDetail.id, edge.id);
  TestValidator.equals(
    "workflow id matches",
    edgeDetail.workflow_id,
    workflowId,
  );
  TestValidator.equals(
    "from_node_id matches",
    edgeDetail.from_node_id,
    node1.id,
  );
  TestValidator.equals("to_node_id matches", edgeDetail.to_node_id, node2.id);
  TestValidator.predicate(
    "created_at format valid",
    typeof edgeDetail.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at format valid",
    typeof edgeDetail.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is null or string",
    edgeDetail.deleted_at === null || typeof edgeDetail.deleted_at === "string",
  );
}
