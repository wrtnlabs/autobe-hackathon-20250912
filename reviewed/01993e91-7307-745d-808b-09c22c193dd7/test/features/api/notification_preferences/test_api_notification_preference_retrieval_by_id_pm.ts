import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Test retrieval of a specific notification preference by its ID for a PM user.
 *
 * This test covers:
 *
 * 1. Successful retrieval of a notification preference linked to the PM user.
 * 2. Validation that the returned data matches the requested ID and logged-in
 *    user.
 * 3. Error handling on retrieval attempt with a non-existent notification
 *    preference ID.
 *
 * Due to lack of a preference creation API, the test uses the PM user's ID as
 * an ID to retrieve the notification preference, serving as a best-effort
 * approach to verify the retrieval functionality under constraints.
 */
export async function test_api_notification_preference_retrieval_by_id_pm(
  connection: api.IConnection,
) {
  // 1. Join PM user
  const pmCreateBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password: "password",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuthorized);

  // 2. Login PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const loggedInPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(loggedInPm);

  // 3. Retrieve notification preference by a valid id (using PM user's id)
  const validId = pmAuthorized.id;
  const notificationPreference: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.pm.notificationPreferences.atNotificationPreference(
      connection,
      { id: validId },
    );
  typia.assert(notificationPreference);

  // Validate returned data matches requested id
  TestValidator.equals(
    "notification preference id matches requested id",
    notificationPreference.id,
    validId,
  );
  // Validate the notification preference's user_id matches logged-in PM id
  TestValidator.equals(
    "notification preference user_id matches logged in PM id",
    notificationPreference.user_id,
    loggedInPm.id,
  );

  // 4. Retrieve notification preference by a non-existent id, expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval with non-existent id should fail",
    async () => {
      await api.functional.taskManagement.pm.notificationPreferences.atNotificationPreference(
        connection,
        { id: nonExistentId },
      );
    },
  );
}
