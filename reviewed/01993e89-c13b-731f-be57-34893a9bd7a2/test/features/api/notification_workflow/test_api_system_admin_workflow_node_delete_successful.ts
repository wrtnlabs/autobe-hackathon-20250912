import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * E2E test for successful deletion of a notification workflow node by a
 * system administrator.
 *
 * This test carries out the full workflow:
 *
 * 1. System administrator registration and authentication.
 * 2. Creation of a notification workflow with valid required fields.
 * 3. Creation of a workflow node associated with the workflow.
 * 4. Deletion of the created workflow node.
 *
 * The test validates API contracts and proper authorization via type
 * assertions and confirms void response on deletion.
 */
export async function test_api_system_admin_workflow_node_delete_successful(
  connection: api.IConnection,
) {
  // 1. System admin join and authenticate
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "1234";
  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(admin);

  // 2. Create notification workflow
  // Because entry_node_id must be a UUID and present, generate a UUID for it
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCode = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const workflowName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const version = 1;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: {
          code: workflowCode,
          name: workflowName,
          is_active: true,
          entry_node_id: entryNodeId,
          version,
        } satisfies INotificationWorkflowWorkflow.ICreate,
      },
    );
  typia.assert(workflow);

  // 3. Create workflow node
  // Required workflow_id: workflow.id, node_type: arbitrary string (EmailNode, SMSNode, DelayNode etc.), name, optional templates or delay fields
  const workflowNodeName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 11,
  });
  const nodeType = "EmailNode";

  const workflowNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: nodeType,
    name: workflowNodeName,
    email_to_template: "{{ user.email }}",
    email_subject_template: "Subject Example",
    email_body_template:
      "Hello {{ user.name }}, this is a test email template.",
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
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

  // 4. Delete the created workflow node
  await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.eraseWorkflowNode(
    connection,
    {
      workflowId: workflow.id,
      workflowNodeId: workflowNode.id,
    },
  );
}
