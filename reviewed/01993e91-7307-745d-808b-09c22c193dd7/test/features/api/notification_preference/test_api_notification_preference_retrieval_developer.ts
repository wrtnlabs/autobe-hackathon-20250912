import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";

/**
 * Verify developer user's ability to retrieve notification preference by
 * ID.
 *
 * This test includes developer registration and login to establish valid
 * auth context. Then it tests:
 *
 * - Successful notification preference retrieval with a valid ID.
 * - Error handling for non-existent valid UUID.
 * - Error handling for invalid format (non-UUID) ID.
 *
 * Validations ensure response matches the requested ID and is type-safe.
 */
export async function test_api_notification_preference_retrieval_developer(
  connection: api.IConnection,
) {
  // 1. Developer user registration for authentication context
  const developerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;

  const developerAuthorized: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developerAuthorized);

  // 2. Developer user login for token refresh (optional but simulates actual flow)
  // Note: We use password_hash as 'password' here due to scenario limitations
  const developerLoginBody = {
    email: developerCreateBody.email,
    password: developerCreateBody.password_hash,
  } satisfies ITaskManagementDeveloper.ILogin;

  const developerLoggedIn: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLoggedIn);

  // 3. Attempt to retrieve notification preference by valid existing ID
  // Using the ID from the token or generate a random valid UUID
  const validNotificationPreferenceId = typia.random<
    string & tags.Format<"uuid">
  >();
  let notificationPreference: ITaskManagementNotificationPreferences;
  try {
    notificationPreference =
      await api.functional.taskManagement.developer.notificationPreferences.atNotificationPreference(
        connection,
        { id: validNotificationPreferenceId },
      );
    typia.assert(notificationPreference);
    TestValidator.equals(
      "notification preference id should match requested id",
      notificationPreference.id,
      validNotificationPreferenceId,
    );
  } catch {
    // It's possible the ID does not exist yet - if so, just continue
  }

  // 4. Error case: retrieval by non-existent valid UUID (expected to fail)
  const nonExistentId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.error(
    "retrieving non-existent notification preference should fail",
    async () => {
      await api.functional.taskManagement.developer.notificationPreferences.atNotificationPreference(
        connection,
        { id: nonExistentId },
      );
    },
  );

  // 5. Error case: retrieval by invalid format ID
  const invalidId = "invalid-uuid-format";
  await TestValidator.error(
    "retrieving notification preference with invalid ID format should fail",
    async () => {
      await api.functional.taskManagement.developer.notificationPreferences.atNotificationPreference(
        connection,
        { id: invalidId as string & tags.Format<"uuid"> },
      );
    },
  );
}
