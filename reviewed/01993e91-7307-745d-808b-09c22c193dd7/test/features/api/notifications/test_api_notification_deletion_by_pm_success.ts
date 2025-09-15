import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Tests the full lifecycle of notification deletion by an authenticated PM.
 *
 * It covers:
 *
 * 1. Registering a new PM user
 * 2. Logging in to obtain authentication tokens
 * 3. Deleting a notification by ID
 *
 * The test verifies that the deletion request succeeds without error, and
 * further attempts to delete without authentication fail, ensuring robust
 * access control and proper resource deletion behavior.
 */
export async function test_api_notification_deletion_by_pm_success(
  connection: api.IConnection,
) {
  // 1. Register PM user
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmAuthorized);

  // 2. Login PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoggedIn);

  // 3. Delete notification
  // Use a valid UUID string as the notification id
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.taskManagement.pm.notifications.eraseNotification(
    connection,
    {
      id: notificationId,
    },
  );

  // 4. Attempt to delete notification without authentication
  // Create unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("deletion unauthorized without login", async () => {
    await api.functional.taskManagement.pm.notifications.eraseNotification(
      unauthenticatedConnection,
      {
        id: notificationId,
      },
    );
  });
}
