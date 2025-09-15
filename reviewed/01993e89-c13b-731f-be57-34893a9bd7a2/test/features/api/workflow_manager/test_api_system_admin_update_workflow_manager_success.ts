import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

export async function test_api_system_admin_update_workflow_manager_success(
  connection: api.IConnection,
) {
  // 1. Create systemAdmin user and authenticate
  const systemAdminBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "securePassword123!",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminBody,
    });
  typia.assert(systemAdmin);

  // 2. Create a workflowManager user to be updated
  const workflowManagerCreateBody = {
    email: `wm_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;
  const workflowManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: workflowManagerCreateBody,
    });
  typia.assert(workflowManager);

  // 3. Update workflowManager details
  const updateBody = {
    email: `updated_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.IUpdate;
  const updatedWorkflowManager: INotificationWorkflowWorkflowManager =
    await api.functional.notificationWorkflow.systemAdmin.workflowManagers.update(
      connection,
      {
        id: workflowManager.id,
        body: updateBody,
      },
    );
  typia.assert(updatedWorkflowManager);

  // 4. Validate updated fields
  TestValidator.equals(
    "WorkflowManager id should remain unchanged",
    updatedWorkflowManager.id,
    workflowManager.id,
  );
  TestValidator.equals(
    "WorkflowManager email should be updated",
    updatedWorkflowManager.email,
    updateBody.email,
  );
  TestValidator.equals(
    "WorkflowManager password_hash should be updated",
    updatedWorkflowManager.password_hash,
    updateBody.password_hash,
  );
}
