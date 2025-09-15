import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * This test validates the permanent deletion of a notification workflow by a
 * system administrator.
 *
 * It performs the following operations step-by-step:
 *
 * 1. Registers and authenticates a system administrator.
 * 2. Creates a workflow node to be used as the entry node.
 * 3. Creates a notification workflow referencing the entry node.
 * 4. Deletes the created notification workflow using the workflow ID.
 *
 * Each step performs strict type assertions on responses where applicable. The
 * delete operation is checked for successful completion without error.
 */
export async function test_api_notification_workflow_workflowsystemadmin_delete_success(
  connection: api.IConnection,
) {
  // 1. System admin user joins and authenticates
  const joinBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "P@ssword1234",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(systemAdmin);

  // 2. Create a dummy workflow node with a dummy workflow id for initial node creation
  const dummyWorkflowId = typia.random<string & tags.Format<"uuid">>();
  const createNodeBody = {
    workflow_id: dummyWorkflowId,
    node_type: "DelayNode",
    name: "Entry Node",
    delay_ms: 10000,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const node: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: dummyWorkflowId,
        body: createNodeBody,
      },
    );
  typia.assert(node);

  // 3. Create a notification workflow referencing the created node's id
  const createWorkflowBody = {
    code: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 5,
    }).replace(/\s/g, "_"),
    name: RandomGenerator.name(2),
    is_active: true,
    entry_node_id: node.id,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: createWorkflowBody,
      },
    );
  typia.assert(workflow);

  // 4. Erase the notification workflow
  await api.functional.notificationWorkflow.systemAdmin.workflows.erase(
    connection,
    {
      workflowId: workflow.id,
    },
  );
}
