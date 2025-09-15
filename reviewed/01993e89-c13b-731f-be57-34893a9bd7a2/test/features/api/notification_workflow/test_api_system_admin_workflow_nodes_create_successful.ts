import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

export async function test_api_system_admin_workflow_nodes_create_successful(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a system administrator
  const email: string = `sysadmin.${typia.random<string & tags.Pattern<"^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$">>()}`;
  const password: string = RandomGenerator.alphaNumeric(12);
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // 2. Create a notification workflow with an entry_node_id
  // For entry_node_id, since no prior node exists, generate a UUID to serve as the entry node
  const entryNodeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const workflowCreateBody = {
    code: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    name: RandomGenerator.name(2),
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

  // Check entry_node_id correctness
  TestValidator.equals(
    "entry_node_id matches",
    workflow.entry_node_id,
    entryNodeId,
  );

  // 3. Create a workflow node of type "sms" with LiquidJS templates
  const workflowNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "sms",
    name: "sms node",
    sms_to_template: `{{ user.phone }}`,
    sms_body_template: `Hello {{ user.name }}, your notification!`,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const workflowNode: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: workflowNodeCreateBody,
      },
    );
  typia.assert(workflowNode);

  // 4. Validate the workflow node creation response
  TestValidator.predicate(
    "workflow node id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      workflowNode.id,
    ),
  );

  // Using typia.assert suffices for date-time format validation
  typia.assert(workflowNode.created_at);
  typia.assert(workflowNode.updated_at);
}
