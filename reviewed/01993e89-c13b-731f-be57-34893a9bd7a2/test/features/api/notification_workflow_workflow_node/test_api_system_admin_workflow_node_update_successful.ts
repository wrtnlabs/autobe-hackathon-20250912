import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * Validate workflow node update by a system administrator.
 *
 * This test covers the entire lifecycle from system admin join
 * (authentication), through creation of a notification workflow and a
 * workflow node, followed by an update of the workflow node's LiquidJS
 * templates.
 *
 * Ensures the update operation correctly modifies only the specified
 * templates while other workflow and node metadata remain unchanged.
 *
 * Workflow:
 *
 * 1. System admin user joins and authenticates.
 * 2. Create a notification workflow with a generated UUID as entry node ID.
 * 3. Create a workflow node under the created workflow.
 * 4. Update the newly created workflow node's email body and SMS body
 *    templates.
 * 5. Assert response integrity and template correctness.
 */
export async function test_api_system_admin_workflow_node_update_successful(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a system admin user
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssword1234",
    } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
  });
  typia.assert(systemAdmin);

  // 2. Create a notification workflow
  // Use a generated UUID for entry_node_id
  const entryNodeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const workflowCreateBody = {
    code: `WF-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    name: `Notify Workflow ${RandomGenerator.paragraph({ sentences: 2 })}`,
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);

  // 3. Create a workflow node within the created workflow
  const workflowNodeCreateBody = {
    workflow_id: workflow.id,
    node_type: "EmailNode",
    name: `Initial Node ${RandomGenerator.paragraph({ sentences: 1 })}`,
    email_to_template: null,
    email_subject_template: null,
    email_body_template: null,
    sms_to_template: null,
    sms_body_template: null,
    delay_ms: null,
    delay_duration: null,
  } satisfies INotificationWorkflowWorkflowNode.ICreate;

  const workflowNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.create(
      connection,
      {
        workflowId: workflow.id,
        body: workflowNodeCreateBody,
      },
    );
  typia.assert(workflowNode);

  // 4. Prepare updated templates for email and SMS
  const updatedEmailBodyTemplate = `{{ user.name }}'s subscription will expire soon.`;
  const updatedSmsBodyTemplate = `Alert: Subscription expiry notice for {{ user.name }}`;

  // 5. Update the workflow node with new templates
  const updateBody = {
    email_body_template: updatedEmailBodyTemplate,
    sms_body_template: updatedSmsBodyTemplate,
  } satisfies INotificationWorkflowWorkflowNode.IUpdate;

  const updatedNode =
    await api.functional.notificationWorkflow.systemAdmin.workflows.workflowNodes.updateWorkflowNode(
      connection,
      {
        workflowId: workflow.id,
        workflowNodeId: workflowNode.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNode);

  // Validate that the returned updated node has the new templates
  TestValidator.equals(
    "workflow node id remains the same",
    updatedNode.id,
    workflowNode.id,
  );
  TestValidator.equals(
    "workflow id remains the same",
    updatedNode.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "email body template updated",
    updatedNode.email_body_template ?? null,
    updatedEmailBodyTemplate,
  );
  TestValidator.equals(
    "sms body template updated",
    updatedNode.sms_body_template ?? null,
    updatedSmsBodyTemplate,
  );
}
