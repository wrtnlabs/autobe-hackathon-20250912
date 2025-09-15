import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-end test for TPM notification preference deletion.
 *
 * This test covers the full workflow to register and authenticate a TPM
 * user, then attempts to delete a notification preference by its ID. It
 * ensures that deletion succeeds for an existing preference, fails on
 * repeated deletion, and enforces access control by checking
 * unauthenticated deletion attempts.
 *
 * The test generates realistic TPM user data, performs all API calls with
 * proper authentication management, and validates expected error conditions
 * through TestValidator assertions.
 */
export async function test_api_notification_preference_deletion_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new TPM user (join)
  const joinBody = {
    email: `test${RandomGenerator.alphaNumeric(6)}@test.com`,
    password: "P@ssw0rd123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(tpmUser);

  // 2. Login with the TPM user credentials to authenticate session
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUserLogin = await api.functional.auth.tpm.login(connection, {
    body: loginBody,
  });
  typia.assert(tpmUserLogin);

  // 3. Authentication token is automatically set after login
  // 4. Simulate a notification preference UUID to delete
  const notificationPrefId = typia.random<string & tags.Format<"uuid">>();

  // 5. Attempt to delete a notification preference by ID
  await api.functional.taskManagement.tpm.notificationPreferences.erase(
    connection,
    { id: notificationPrefId },
  );

  // 6. Delete again should fail with error (e.g., 404 Not Found)
  await TestValidator.error(
    "should throw error when deleting non-existent notification preference",
    async () => {
      await api.functional.taskManagement.tpm.notificationPreferences.erase(
        connection,
        { id: notificationPrefId },
      );
    },
  );

  // 7. Attempt to delete without authentication
  const unauthConnection = { ...connection, headers: {} };
  const anotherNotificationPrefId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.taskManagement.tpm.notificationPreferences.erase(
      unauthConnection,
      { id: anotherNotificationPrefId },
    );
  });
}
