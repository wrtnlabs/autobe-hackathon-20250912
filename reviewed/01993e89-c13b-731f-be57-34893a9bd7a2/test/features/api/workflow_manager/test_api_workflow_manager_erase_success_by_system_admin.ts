import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * This test scenario verifies the successful deletion of a workflow manager
 * user by a system administrator.
 *
 * It first creates a new system administrator user by joining
 * /auth/systemAdmin/join to establish an admin authentication context. Then, it
 * creates a new workflow manager user via /auth/workflowManager/join while
 * authenticated as the system admin. After the workflow manager user exists,
 * the test deletes the user by calling DELETE
 * /notificationWorkflow/systemAdmin/workflowManagers/{id}.
 *
 * It verifies that deletion succeeds without error, and that deleting a
 * non-existent user subsequently results in an error. This confirms proper
 * authorization, deletion handling, and error management in the API.
 */
export async function test_api_workflow_manager_erase_success_by_system_admin(
  connection: api.IConnection,
) {
  // 1. System administrator joins and gets authenticated
  const systemAdminEmail = `admin${RandomGenerator.alphaNumeric(8)}@example.com`;
  const systemAdminPassword = `P@ssw0rd${RandomGenerator.alphaNumeric(6)}`;

  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password: systemAdminPassword,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // 2. Workflow manager user joins using same admin connection context
  const workflowManagerEmail = `manager${RandomGenerator.alphaNumeric(8)}@example.com`;
  const workflowManagerPasswordHash = `hashedP@ss${RandomGenerator.alphaNumeric(10)}`;

  const workflowManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email: workflowManagerEmail,
        password_hash: workflowManagerPasswordHash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(workflowManager);

  // 3. System admin deletes the workflow manager by ID
  await api.functional.notificationWorkflow.systemAdmin.workflowManagers.erase(
    connection,
    {
      id: workflowManager.id,
    },
  );

  // 4. Attempt to delete the same workflow manager again (non-existent now)
  await TestValidator.error(
    "Deleting non-existent workflow manager throws error",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.workflowManagers.erase(
        connection,
        {
          id: workflowManager.id,
        },
      );
    },
  );
}
