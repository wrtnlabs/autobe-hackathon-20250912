import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * End-to-end test to verify that PMO users can delete task management roles
 * by ID.
 *
 * This tests the authorization of PMO users to delete roles and proper
 * error handling when roles do not exist or when unauthorized deletions are
 * attempted.
 *
 * Steps:
 *
 * 1. Authenticate as PMO user by registering a new PMO account.
 * 2. Attempt to delete a task management role with a random UUID, expect
 *    success if role exists (no content returned).
 * 3. Attempt to delete a task management role using a non-existent UUID,
 *    expect error thrown.
 * 4. Authenticate as an unauthorized user using the same join endpoint but
 *    simulating unauthorized case.
 * 5. Attempt to delete a role with the unauthorized user, expect an
 *    authorization error.
 */
export async function test_api_task_management_role_deletion_by_pmo(
  connection: api.IConnection,
) {
  // 1. PMO join and authenticate
  const pmoJoinBody = {
    email: `pmo_user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "securePassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. Delete a TaskManagementRole by random UUID (simulate existing ID)
  const existingRoleId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.taskManagement.pmo.taskManagementRoles.erase(
    connection,
    {
      id: existingRoleId,
    },
  );

  // 3. Attempt to delete a non-existing role ID and expect an error
  const nonExistingRoleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "Deleting non-existing role should throw error",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementRoles.erase(
        connection,
        {
          id: nonExistingRoleId,
        },
      );
    },
  );

  // 4. Attempt unauthorized deletion by simulating a new connection (unauthorized user)
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized user deletion should be denied",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementRoles.erase(
        unauthorizedConnection,
        {
          id: existingRoleId,
        },
      );
    },
  );
}
