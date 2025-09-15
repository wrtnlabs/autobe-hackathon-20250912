import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Verify successful deletion of a system administrator user.
 *
 * This test performs the following steps:
 *
 * 1. Creates a new system administrator user by calling the join endpoint with
 *    valid credentials.
 * 2. Authenticates as this system administrator (authentication token managed
 *    by SDK).
 * 3. Calls the delete endpoint with the system administrator's ID to delete
 *    the user.
 * 4. Validates that the delete call completes without error, indicating
 *    permanent deletion.
 *
 * This test validates the system's ability to correctly handle authorized
 * deletion of system administrators, ensuring secure and proper user
 * lifecycle management within the notification workflow.
 */
export async function test_api_system_admin_delete_success(
  connection: api.IConnection,
) {
  // 1. Create a system administrator account via join endpoint
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const authorized: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Delete the created system administrator using the erase endpoint
  await api.functional.notificationWorkflow.systemAdmin.systemAdmins.erase(
    connection,
    { id: authorized.id },
  );
}
