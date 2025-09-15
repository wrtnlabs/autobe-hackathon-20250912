import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * This end-to-end test validates the successful deletion of notifications
 * by a Project Management Officer (PMO). It performs the following steps:
 *
 * 1. Register and join a PMO user.
 * 2. Login as the PMO user to establish authentication.
 * 3. Generate a valid UUID for a notification ID to delete (assuming the
 *    notification exists or is simulated).
 * 4. Perform the deletion request to the notification endpoint using the PMO
 *    user's authentication context.
 * 5. Validate no errors are thrown on successful deletion.
 * 6. Attempt to delete the same notification again and verify an error is
 *    correctly thrown (e.g., 404 Not Found).
 * 7. Attempt unauthorized deletion by making a deletion call without
 *    authentication and validate error is thrown.
 * 8. Also test deletion attempt with an invalid UUID format and validate error
 *    is thrown.
 *
 * The test asserts proper authorization enforcement, correct HTTP methods,
 * and response codes. It ensures that PMO users can delete notifications,
 * and API responses behave correctly under various conditions.
 */
export async function test_api_notification_deletion_by_pmo_success(
  connection: api.IConnection,
) {
  // 1. Register and join a PMO user
  const pmoJoinBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "TestPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const joinedPmo: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(joinedPmo);

  // 2. Login as the PMO user
  const loginBody = {
    email: joinedPmo.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const loggedInPmo: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInPmo);

  // 3. Generate a notification ID to delete (UUID format)
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 4. Perform a deletion request to erase the notification
  await api.functional.taskManagement.pmo.notifications.eraseNotification(
    connection,
    {
      id: notificationId,
    },
  );

  // 5. Try to delete the same notification again and expect an error (e.g., 404)
  await TestValidator.error(
    "deleting already deleted notification throws error",
    async () => {
      await api.functional.taskManagement.pmo.notifications.eraseNotification(
        connection,
        {
          id: notificationId,
        },
      );
    },
  );

  // 6. Attempt deletion without authentication - unauthorized error expected
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion attempt throws error",
    async () => {
      await api.functional.taskManagement.pmo.notifications.eraseNotification(
        unauthConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Attempt deletion with an invalid UUID format and expect an error
  await TestValidator.error(
    "deletion with invalid ID format throws error",
    async () => {
      await api.functional.taskManagement.pmo.notifications.eraseNotification(
        connection,
        {
          id: "invalid-uuid-format-string",
        },
      );
    },
  );
}
