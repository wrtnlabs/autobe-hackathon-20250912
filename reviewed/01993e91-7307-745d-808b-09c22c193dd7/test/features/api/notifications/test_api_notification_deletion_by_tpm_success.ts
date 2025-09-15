import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * E2E test for deletion of notifications by an authenticated TPM user.
 *
 * This test verifies that a TPM (Technical Project Manager) user can
 * successfully delete a notification by its ID. It follows the process of user
 * registration, login, deletion API call, and validates error handling for
 * repeated and unauthorized deletion attempts.
 *
 * Steps:
 *
 * 1. Register a new TPM user with realistic email, password, and name.
 * 2. Log in as the TPM user to receive authentication tokens.
 * 3. Use a simulated notification ID (UUID) to test deletion.
 * 4. Perform deletion and expect no errors.
 * 5. Attempt to delete the same notification again, expect errors.
 * 6. Attempt to delete notification with an unauthenticated connection, expect
 *    errors.
 */
export async function test_api_notification_deletion_by_tpm_success(
  connection: api.IConnection,
) {
  // Generate realistic TPM registration info
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  const name = typia.random<string>();

  // 1) Register TPM user
  const authorized = await api.functional.auth.tpm.join(connection, {
    body: {
      email,
      password,
      name,
    } satisfies ITaskManagementTpm.IJoin,
  });
  typia.assert(authorized);

  // 2) Login TPM user
  const loginResult = await api.functional.auth.tpm.login(connection, {
    body: {
      email,
      password,
    } satisfies ITaskManagementTpm.ILogin,
  });
  typia.assert(loginResult);

  // 3) Prepare a notification ID (simulate creation)
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 4) Delete notification successfully
  await api.functional.taskManagement.tpm.notifications.eraseNotification(
    connection,
    {
      id: notificationId,
    },
  );

  // 5) Attempt to delete non-existent notification to expect error
  await TestValidator.error(
    "delete non-existent notification should fail",
    async () => {
      await api.functional.taskManagement.tpm.notifications.eraseNotification(
        connection,
        {
          id: notificationId,
        },
      );
    },
  );

  // 6) Attempt to delete notification without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated delete should fail", async () => {
    await api.functional.taskManagement.tpm.notifications.eraseNotification(
      unauthConn,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
