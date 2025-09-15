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

/**
 * Validate creation of workflow edge in a notification workflow system.
 *
 * This test verifies a complete business workflow involving multiple user
 * roles authenticating and interacting to create a notification workflow,
 * adding nodes and edges successfully.
 *
 * Test Steps:
 *
 * 1. System admin user joins and authenticates.
 * 2. Workflow manager user joins and authenticates.
 * 3. System admin creates a new notification workflow with version 1 and entry
 *    node id.
 * 4. Workflow manager creates two workflow nodes (from-node and to-node) with
 *    proper node types, templates, and null delays.
 * 5. Workflow manager creates a workflow edge connecting the two nodes.
 * 6. Use typia.assert to validate every successful response.
 * 7. Use TestValidator to compare crucial properties ensuring correctness.
 *
 * This validates authorization, data integrity, and business rule
 * enforcement for creating workflow edges in the system.
 */
export async function test_api_workflow_workflow_edge_create_success(
  connection: api.IConnection,
) {
  // 1. System admin user registration
  const systemAdminEmail = `${RandomGenerator.name(2).replace(/ /g, ".").toLowerCase()}@example.com`;
  const systemAdminPassword = "StrongPassword123!";
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password: systemAdminPassword,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // 2. Workflow manager user registration
  const workflowManagerEmail = `${RandomGenerator.name(2).replace(/ /g, ".").toLowerCase()}@example.com`;
  const workflowManagerPassword = "StrongPassword123!";
  const workflowManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: workflowManagerEmail,
        password_hash: workflowManagerPassword,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(workflowManager);

  // 3. System admin login for secured operations
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password: systemAdminPassword,
    } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
  });

  // 4. Create a new notification workflow
  const entryNodeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: {
          code: `wf_${RandomGenerator.alphaNumeric(8)}`,
          name: `Workflow ${RandomGenerator.name(2)}`,
          is_active: true,
          entry_node_id: entryNodeId,
          version: 1,
        } satisfies INotificationWorkflowWorkflow.ICreate,
      },
    );
  typia.assert(newWorkflow);
  TestValidator.predicate(
    "New workflow has valid UUID id",
    typeof newWorkflow.id === "string" &&
      /^[0-9a-fA-F\-]{36}$/.test(newWorkflow.id),
  );

  // 5. Workflow manager login to perform node and edge operations
  await api.functional.auth.workflowManager.login(connection, {
    body: {
      email: workflowManagerEmail,
      password: workflowManagerPassword,
    } satisfies INotificationWorkflowWorkflowManager.ILogin,
  });

  // 6. Create from-node
  const fromNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: newWorkflow.id,
        body: {
          workflow_id: newWorkflow.id,
          node_type: "Email",
          name: "From Node",
          email_to_template: "{{ user.email }}",
          email_subject_template: "Welcome Email",
          email_body_template: "Hello, {{ user.name }}!",
          sms_to_template: null,
          sms_body_template: null,
          delay_ms: null,
          delay_duration: null,
        } satisfies INotificationWorkflowWorkflowNode.ICreate,
      },
    );
  typia.assert(fromNode);

  // 7. Create to-node
  const toNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      {
        workflowId: newWorkflow.id,
        body: {
          workflow_id: newWorkflow.id,
          node_type: "SMS",
          name: "To Node",
          email_to_template: null,
          email_subject_template: null,
          email_body_template: null,
          sms_to_template: "{{ user.phone }}",
          sms_body_template: "Your code is 1234",
          delay_ms: null,
          delay_duration: null,
        } satisfies INotificationWorkflowWorkflowNode.ICreate,
      },
    );
  typia.assert(toNode);

  // 8. Create workflow edge linking from-node to to-node
  const workflowEdge: INotificationWorkflowWorkflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      {
        workflowId: newWorkflow.id,
        body: {
          workflow_id: newWorkflow.id,
          from_node_id: fromNode.id,
          to_node_id: toNode.id,
        } satisfies INotificationWorkflowWorkflowEdge.ICreate,
      },
    );
  typia.assert(workflowEdge);

  // 9. Validate workflow edge properties
  TestValidator.equals(
    "Workflow Edge links correct workflow",
    workflowEdge.workflow_id,
    newWorkflow.id,
  );
  TestValidator.equals(
    "Workflow Edge links correct from node",
    workflowEdge.from_node_id,
    fromNode.id,
  );
  TestValidator.equals(
    "Workflow Edge links correct to node",
    workflowEdge.to_node_id,
    toNode.id,
  );
}
