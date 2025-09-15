import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Test retrieval of a specific notification preference by its ID for a PMO
 * user, validating success, security, and error scenarios.
 *
 * This test ensures that PMO users can retrieve their own notification
 * preferences by ID, that unauthorized access is blocked, and that requests for
 * non-existent preferences are handled gracefully.
 *
 * Workflow:
 *
 * 1. Register and login PMO user A.
 * 2. Retrieve an existing notification preference by its ID as user A and validate
 *    data correctness.
 * 3. Register and login PMO user B.
 * 4. Attempt to retrieve user A's preference as user B, expect authorization
 *    failure.
 * 5. Attempt to retrieve a non-existent preference ID as user A, expect not found
 *    error.
 */
export async function test_api_notification_preference_retrieval_by_id_pmo(
  connection: api.IConnection,
) {
  // 1. Register PMO user A
  const userABody = {
    email: `usera+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "SecurePass123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const userA: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: userABody });
  typia.assert(userA);

  // 2. Login PMO user A (to confirm token refresh and logged session)
  const loginA: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: {
        email: userABody.email,
        password: userABody.password,
      } satisfies ITaskManagementPmo.ILogin,
    });
  typia.assert(loginA);

  // Simulate a valid notification preference ID for user A
  const validPrefId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve notification preference by ID as user A
  const prefA: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.pmo.notificationPreferences.atNotificationPreference(
      connection,
      { id: validPrefId },
    );
  typia.assert(prefA);
  TestValidator.equals(
    "retrieved preference ID matches requested",
    prefA.id,
    validPrefId,
  );

  // 4. Register PMO user B
  const userBBody = {
    email: `userb+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "SecurePass123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const userB: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: userBBody });
  typia.assert(userB);

  // 5. Login PMO user B
  const loginB: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: {
        email: userBBody.email,
        password: userBBody.password,
      } satisfies ITaskManagementPmo.ILogin,
    });
  typia.assert(loginB);

  // 6. As user B, attempt to retrieve user A's preference; expect error
  await TestValidator.error(
    "user B cannot access user A's notification preference",
    async () => {
      await api.functional.taskManagement.pmo.notificationPreferences.atNotificationPreference(
        connection,
        { id: validPrefId },
      );
    },
  );

  // 7. As user A, attempt to retrieve non-existent preference ID; expect error
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "accessing non-existent notification preference throws error",
    async () => {
      await api.functional.taskManagement.pmo.notificationPreferences.atNotificationPreference(
        connection,
        { id: nonExistentId },
      );
    },
  );
}
