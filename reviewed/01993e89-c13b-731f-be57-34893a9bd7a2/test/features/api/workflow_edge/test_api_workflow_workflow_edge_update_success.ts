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

export async function test_api_workflow_workflow_edge_update_success(
  connection: api.IConnection,
) {
  // 1. Create & authenticate system admin user
  const adminJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@admin.com",
    password: "AdminPass123!",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(systemAdmin);

  // 2. Login system admin user
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;
  await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });

  // 3. Create workflow by system admin (entry_node_id will be updated later)
  // First create with dummy entry_node_id, will patch after node creation
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: "Test Workflow",
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);

  // 4. Create workflow manager user
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerJoinBody: INotificationWorkflowWorkflowManager.ICreate = {
    email: RandomGenerator.alphaNumeric(10) + "@manager.com",
    password_hash: managerPassword,
  };
  const workflowManager = await api.functional.auth.workflowManager.join(
    connection,
    { body: managerJoinBody },
  );
  typia.assert(workflowManager);

  // 5. Login workflow manager user with plain password string
  const managerLoginBody: INotificationWorkflowWorkflowManager.ILogin = {
    email: managerJoinBody.email,
    password: managerPassword,
  };
  await api.functional.auth.workflowManager.login(connection, {
    body: managerLoginBody,
  });

  // 6. Create original from-node
  const fromNodeBody = {
    workflow_id: workflow.id,
    node_type: "email",
    name: "Original From Node",
    email_to_template: "to@example.com",
    email_subject_template: "Subject",
    email_body_template: "Body",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const fromNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: fromNodeBody },
    );
  typia.assert(fromNode);

  // Update entry_node_id for workflow to be fromNode.id (valid node)
  // Note: The DTO for workflow update not given, so we skip patching workflow entry_node_id

  // 7. Create original to-node
  const toNodeBody = {
    workflow_id: workflow.id,
    node_type: "email",
    name: "Original To Node",
    email_to_template: "to2@example.com",
    email_subject_template: "Subject 2",
    email_body_template: "Body 2",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const toNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: toNodeBody },
    );
  typia.assert(toNode);

  // 8. Create new to-node
  const newToNodeBody = {
    workflow_id: workflow.id,
    node_type: "email",
    name: "New To Node",
    email_to_template: "newto@example.com",
    email_subject_template: "New Subject",
    email_body_template: "New Body",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const newToNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: newToNodeBody },
    );
  typia.assert(newToNode);

  // 9. Create workflow edge from original from-node to original to-node
  const edgeCreateBody = {
    workflow_id: workflow.id,
    from_node_id: fromNode.id,
    to_node_id: toNode.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;
  const workflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      { workflowId: workflow.id, body: edgeCreateBody },
    );
  typia.assert(workflowEdge);

  // 10. Update the workflow edge to have to_node_id replaced by new to-node id
  const edgeUpdateBody = {
    to_node_id: newToNode.id,
  } satisfies INotificationWorkflowWorkflowEdge.IUpdate;
  const updatedEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.updateEdge(
      connection,
      {
        workflowId: workflow.id,
        workflowEdgeId: workflowEdge.id,
        body: edgeUpdateBody,
      },
    );
  typia.assert(updatedEdge);

  // 11. Validate the updated edge
  TestValidator.equals(
    "from_node_id unchanged",
    updatedEdge.from_node_id,
    fromNode.id,
  );
  TestValidator.equals(
    "to_node_id updated",
    updatedEdge.to_node_id,
    newToNode.id,
  );
}
