import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";

export async function test_api_notification_workflow_workflow_systemadmin_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register system admin to establish authentication context
  const joinBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "ComplexPass123!",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Step 2: Create a notification workflow
  const createBody = {
    code: `workflow_${RandomGenerator.alphaNumeric(6)}`,
    name: `Test Workflow ${RandomGenerator.alphaNumeric(4)}`,
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const createdWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdWorkflow);

  // Step 3: Update the created workflow
  const updateBody = {
    code: `updated_${RandomGenerator.alphaNumeric(6)}`,
    name: `Updated Workflow ${RandomGenerator.alphaNumeric(4)}`,
    is_active: false,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: createdWorkflow.version + 1,
  } satisfies INotificationWorkflowWorkflow.IUpdate;

  const updatedWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.update(
      connection,
      {
        workflowId: createdWorkflow.id,
        body: updateBody,
      },
    );
  typia.assert(updatedWorkflow);

  // Step 4: Validate the update
  TestValidator.equals(
    "workflow ID remains unchanged after update",
    updatedWorkflow.id,
    createdWorkflow.id,
  );
  TestValidator.equals(
    "workflow code is updated",
    updatedWorkflow.code,
    updateBody.code,
  );
  TestValidator.equals(
    "workflow name is updated",
    updatedWorkflow.name,
    updateBody.name,
  );
  TestValidator.equals(
    "workflow is_active is updated",
    updatedWorkflow.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "workflow entry_node_id is updated",
    updatedWorkflow.entry_node_id,
    updateBody.entry_node_id,
  );
  TestValidator.equals(
    "workflow version is incremented",
    updatedWorkflow.version,
    createdWorkflow.version + 1,
  );
  TestValidator.predicate(
    "workflow updated_at is later than or equal to created_at",
    new Date(updatedWorkflow.updated_at).getTime() >=
      new Date(updatedWorkflow.created_at).getTime(),
  );
}
