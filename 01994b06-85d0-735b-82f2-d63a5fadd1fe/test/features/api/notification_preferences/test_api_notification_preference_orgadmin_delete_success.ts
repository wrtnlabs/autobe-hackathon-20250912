import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end deletion test for organization admin notification preference.
 *
 * This test performs the following workflow to cover deletion logic and error
 * scenarios:
 *
 * 1. Register a new organization admin with unique credentials (POST
 *    /auth/organizationAdmin/join)
 * 2. Log in as the created organization admin (POST /auth/organizationAdmin/login)
 *    to establish authentication context
 * 3. Generate a random UUID to simulate an existing notification preference ID
 *    (since no create/list API is given)
 * 4. Delete the notification preference by ID (DELETE
 *    /healthcarePlatform/organizationAdmin/notificationPreferences/{notificationPreferenceId})
 *    and expect success
 * 5. Attempt deleting the same notificationPreferenceId a second time, expecting
 *    an error due to not found or already deleted
 * 6. Attempt deleting a distinct random notificationPreferenceId which should also
 *    produce an error (non-existent record)
 *
 * Note: As SDK does not provide creation or retrieval API for notification
 * preferences, the test cannot verify actual removal or audit logging.
 * Validation is limited to status code/error check on deletion attempts.
 */
export async function test_api_notification_preference_orgadmin_delete_success(
  connection: api.IConnection,
) {
  // 1. Register new org admin
  const orgAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: orgAdminJoin,
  });
  typia.assert(admin);

  // 2. Authenticate as the organization admin (refresh session, sets token)
  const orgAdminLogin = {
    email: orgAdminJoin.email,
    password: orgAdminJoin.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: orgAdminLogin,
    },
  );
  typia.assert(loginResult);

  // 3. Simulate the creation of a notification preference with a random uuid
  const notificationPreferenceId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete the notification preference (should succeed)
  await api.functional.healthcarePlatform.organizationAdmin.notificationPreferences.erase(
    connection,
    { notificationPreferenceId },
  );

  // 5. Attempt to delete the same notification preference again (should error)
  await TestValidator.error(
    "Deleting an already-deleted notification preference returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.notificationPreferences.erase(
        connection,
        { notificationPreferenceId },
      );
    },
  );

  // 6. Attempt to delete a non-existent notification preference id (random uuid)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting a non-existing notification preferenceId returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.notificationPreferences.erase(
        connection,
        { notificationPreferenceId: randomId },
      );
    },
  );
}
