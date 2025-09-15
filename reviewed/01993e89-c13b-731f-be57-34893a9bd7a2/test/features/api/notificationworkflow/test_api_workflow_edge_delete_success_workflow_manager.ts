import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

export async function test_api_workflow_edge_delete_success_workflow_manager(
  connection: api.IConnection,
) {
  // 1. Workflow manager user creation and authentication
  const managerEmail = `manager_${RandomGenerator.alphaNumeric(8)}@company.com`;
  const managerPassword = `pass_${RandomGenerator.alphaNumeric(12)}`;
  const manager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: managerEmail,
        password_hash: managerPassword,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(manager);

  // 2. Create a notification workflow
  // We must first create initial node to use its id as entry_node_id
  // For this test, create a stub node first, then create workflow, then create actual nodes

  // 2a. Create a stub node to obtain a valid UUID for entry_node_id
  // Because workflow creation requires an existing node id as entry_node_id
  // As the actual workflow requires real nodes, we will create nodes after workflow creation

  // We will create temporary nodes after workflow creation, workaround approach

  // So for now, generate a random UUID for the entry_node_id in workflow creation
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();

  const workflowCreateReq = {
    code: `workflow_${RandomGenerator.alphaNumeric(8)}`,
    name: `Workflow ${RandomGenerator.paragraph({ sentences: 2 })}`,
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  // Create workflow
  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreateReq,
      },
    );
  typia.assert(workflow);
  TestValidator.equals("Workflow code", workflow.code, workflowCreateReq.code);

  // 3. Create first workflow node (entry node)
  const nodeCreateReq1 = {
    workflow_id: workflow.id,
    node_type: "Email",
    name: "Entry Node",
    email_to_template: "{{user_email}}",
    email_subject_template: "Welcome",
    email_body_template: "Welcome to our workflow.",
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
        body: nodeCreateReq1,
      },
    );
  typia.assert(node1);
  TestValidator.equals("Node1 name", node1.name, nodeCreateReq1.name);

  // 4. Create second workflow node
  const nodeCreateReq2 = {
    workflow_id: workflow.id,
    node_type: "SMS",
    name: "Second Node",
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: "{{user_phone}}",
    sms_body_template: "Hello from second node",
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const node2: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: nodeCreateReq2,
      },
    );
  typia.assert(node2);
  TestValidator.equals("Node2 name", node2.name, nodeCreateReq2.name);

  // Now we correct the workflow's entry_node_id by assuming DAG update outside this test
  // Note: API doesn't have update workflow endpoint, so we accept this test state

  // 5. Create a workflow edge connecting node1 to node2
  const edgeCreateReq = {
    workflow_id: workflow.id,
    from_node_id: node1.id,
    to_node_id: node2.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;

  const edge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: workflow.id,
        body: edgeCreateReq,
      },
    );
  typia.assert(edge);
  TestValidator.equals(
    "Edge from_node_id",
    edge.from_node_id,
    edgeCreateReq.from_node_id,
  );
  TestValidator.equals(
    "Edge to_node_id",
    edge.to_node_id,
    edgeCreateReq.to_node_id,
  );

  // 6. Delete the created workflow edge
  await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.eraseEdge(
    connection,
    {
      workflowId: workflow.id,
      workflowEdgeId: edge.id,
    },
  );

  // Since API does not provide list edges endpoint, we cannot explicitly verify the edge is deleted in read
  // But we can perform a logical assumption that the delete call succeeded without throwing error
  // No further API calls for verification available
}
