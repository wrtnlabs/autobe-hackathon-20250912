import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

export async function test_api_workflowmanager_erase_workflow_node_with_system_admin_authentication(
  connection: api.IConnection,
) {
  // 1. SystemAdmin user registration (authentication)
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminJoinBody = {
    email: systemAdminEmail,
    password: "strongpassword",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdminAuthorized: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdminAuthorized);

  // 2. Create a new notification workflow using the system admin context
  // Use temporary entry_node_id that will be replaced after creation
  const tempEntryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateRequest = {
    code: RandomGenerator.paragraph({ sentences: 1, wordMin: 6, wordMax: 12 }),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 6, wordMax: 12 }),
    is_active: true,
    entry_node_id: tempEntryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflowCreated: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: workflowCreateRequest,
      },
    );
  typia.assert(workflowCreated);

  // 3. Create a workflow node under the newly created workflow
  const workflowNodeCreateRequest = {
    workflow_id: workflowCreated.id,
    node_type: "Email",
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    email_to_template: "{{ user.email }}",
    email_subject_template: RandomGenerator.paragraph({ sentences: 1 }),
    email_body_template: RandomGenerator.content({ paragraphs: 1 }),
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const workflowNodeCreated: INotificationWorkflowWorkflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflowCreated.id,
        body: workflowNodeCreateRequest,
      },
    );
  typia.assert(workflowNodeCreated);

  // 4. Delete the newly created workflow node
  await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.eraseWorkflowNode(
    connection,
    {
      workflowId: workflowCreated.id,
      workflowNodeId: workflowNodeCreated.id,
    },
  );
}
