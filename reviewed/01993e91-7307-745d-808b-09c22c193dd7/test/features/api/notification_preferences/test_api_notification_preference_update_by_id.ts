import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

export async function test_api_notification_preference_update_by_id(
  connection: api.IConnection,
) {
  // 1. Create a QA user with realistic data
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Qwerty123!";
  const joinBody = {
    email,
    password_hash: password, // For testing, password_hash contains plaintext password, assuming system hashes internally
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementQa.ICreate;

  const joinedUser = await api.functional.auth.qa.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedUser);

  // 2. Login the same QA user
  const loginBody = {
    email,
    password,
  } satisfies ITaskManagementQa.ILogin;

  const loggedInUser = await api.functional.auth.qa.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInUser);

  // 3. Prepare update data for notification preference
  const updateData = {
    preference_key: "assignment",
    enabled: true,
    delivery_method: "email",
  } satisfies ITaskManagementNotificationPreferences.IUpdate;

  // 4. Use a realistic notification preference ID (simulate here)
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // 5. Update the notification preference
  const updatedPreference =
    await api.functional.taskManagement.qa.notificationPreferences.updateNotificationPreference(
      connection,
      {
        id: preferenceId,
        body: updateData,
      },
    );
  typia.assert(updatedPreference);

  // 6. Validate that returned preference matches updated information
  TestValidator.equals(
    "notification preference id matches update id",
    updatedPreference.id,
    preferenceId,
  );
  TestValidator.equals(
    "notification preference user_id is set",
    typeof updatedPreference.user_id,
    "string",
  );
  TestValidator.equals(
    "notification preference key",
    updatedPreference.preference_key,
    updateData.preference_key ?? updatedPreference.preference_key,
  );
  TestValidator.equals(
    "notification preference delivery method",
    updatedPreference.delivery_method,
    updateData.delivery_method ?? updatedPreference.delivery_method,
  );
  TestValidator.equals(
    "notification preference enabled flag",
    updatedPreference.enabled,
    updateData.enabled ?? updatedPreference.enabled,
  );
}
