import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Tests deletion of a workflow manager user by an authenticated workflow
 * manager.
 *
 * This test performs the following steps:
 *
 * 1. Creates and authenticates a workflow manager user to establish
 *    authentication context.
 * 2. Creates another workflow manager user to serve as the deletion target.
 * 3. Deletes the second workflow manager user using the authenticated workflow
 *    manager's credentials.
 * 4. Attempts to delete the same user again to confirm error handling on
 *    non-existent deletion.
 * 5. Attempts deletion without authentication to verify authorization failure.
 *
 * Each step uses proper type assertions and TestValidator for validation.
 * The test respects business constraints and API requirements for the
 * workflow manager role.
 */
export async function test_api_workflow_manager_erase_success_by_workflow_manager(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a workflow manager user for the test context
  const creatorCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const creatorUser = await api.functional.auth.workflowManager.join(
    connection,
    {
      body: creatorCreateBody,
    },
  );
  typia.assert(creatorUser);

  // 2. Create a second workflow manager user to be deleted
  const targetCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const targetUser = await api.functional.auth.workflowManager.join(
    connection,
    {
      body: targetCreateBody,
    },
  );
  typia.assert(targetUser);

  // 3. Delete the second workflow manager user by the authenticated creator user
  await api.functional.notificationWorkflow.workflowManager.workflowManagers.erase(
    connection,
    {
      id: targetUser.id,
    },
  );

  // 4. Attempt to delete the same user again; expect error due to non-existence or unauthorized
  await TestValidator.error(
    "deleting non-existent or already deleted workflow manager should fail",
    async () => {
      await api.functional.notificationWorkflow.workflowManager.workflowManagers.erase(
        connection,
        {
          id: targetUser.id,
        },
      );
    },
  );

  // 5. Attempt deletion without authentication (unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated deletion attempt should fail",
    async () => {
      await api.functional.notificationWorkflow.workflowManager.workflowManagers.erase(
        unauthenticatedConnection,
        {
          id: creatorUser.id,
        },
      );
    },
  );
}
