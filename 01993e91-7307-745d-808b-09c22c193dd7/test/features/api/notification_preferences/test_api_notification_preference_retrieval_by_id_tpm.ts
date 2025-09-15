import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test retrieval of a specific notification preference by its ID for a TPM
 * user. The scenario includes:
 *
 * 1. Successful retrieval when the TPM user is authorized and the preference
 *    exists;
 * 2. Authorization checks restricting access to only the owner TPM user;
 * 3. Handling of non-existent preference IDs with proper failure responses;
 * 4. Verification that the response data matches the requested preference ID.
 *
 * Success criteria include accurate data retrieval, authorization enforcement,
 * and error response correctness on invalid inputs.
 *
 * The test flow involves:
 *
 * - Registering two TPM users,
 * - Creating at least one notification preference for one user (simulated here),
 * - Then retrieving the preference by ID as the owning user,
 * - Verifying the preference data,
 * - Attempting retrieval by the other user and expecting failure,
 * - And attempting retrieval of a non-existent ID and expecting failure.
 */
export async function test_api_notification_preference_retrieval_by_id_tpm(
  connection: api.IConnection,
) {
  // 1. TPM user 1 joins
  const firstTpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const firstTpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: firstTpmJoinBody,
    });
  typia.assert(firstTpmUser);

  // 2. TPM user 1 logged in
  const firstTpmLoginBody = {
    email: firstTpmJoinBody.email,
    password: firstTpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const firstTpmAuthorizedUser = await api.functional.auth.tpm.login(
    connection,
    {
      body: firstTpmLoginBody,
    },
  );
  typia.assert(firstTpmAuthorizedUser);

  // 3. TPM user 2 joins
  const secondTpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const secondTpmUser = await api.functional.auth.tpm.join(connection, {
    body: secondTpmJoinBody,
  });
  typia.assert(secondTpmUser);

  // 4. TPM user 2 logged in
  const secondTpmLoginBody = {
    email: secondTpmJoinBody.email,
    password: secondTpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const secondTpmAuthorizedUser = await api.functional.auth.tpm.login(
    connection,
    {
      body: secondTpmLoginBody,
    },
  );
  typia.assert(secondTpmAuthorizedUser);

  // For the test, assume TPM user 1 has at least one notification preference
  // Since we cannot create notification preferences due to lack of create API,
  // simulate existing preference for user 1 by random generation

  // Generate a valid ID for preference belonging to user 1
  const validPreferenceId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Test retrieval as first TPM user (authorized)
  // Because we don't have create endpoint for preferences, we simulate
  // preference retrieval assuming id belongs to user 1

  // Retrieve notification preference by ID
  const preference =
    await api.functional.taskManagement.tpm.notificationPreferences.atNotificationPreference(
      connection,
      {
        id: validPreferenceId,
      },
    );
  typia.assert(preference);

  // Validate the returned preference's id matches requested id
  TestValidator.equals(
    "retrieved notification preference id equals requested id",
    preference.id,
    validPreferenceId,
  );

  // Validate the preference belongs to the user 1
  TestValidator.equals(
    "notification preference belongs to first TPM user",
    preference.user_id,
    firstTpmUser.id,
  );

  // Step 6: Test retrieval as second TPM user (unauthorized)
  // Reset connection to second TPM user's credentials
  await api.functional.auth.tpm.login(connection, {
    body: secondTpmLoginBody,
  });

  // Trying to read preference id belonging to first user must fail
  await TestValidator.error(
    "unauthorized access to notification preference should fail",
    async () => {
      await api.functional.taskManagement.tpm.notificationPreferences.atNotificationPreference(
        connection,
        {
          id: validPreferenceId,
        },
      );
    },
  );

  // Step 7: Test retrieval of non-existent preference id (as first TPM user)
  // Re-login first TPM user
  await api.functional.auth.tpm.login(connection, {
    body: firstTpmLoginBody,
  });

  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieval of non-existent notification preference id should fail",
    async () => {
      await api.functional.taskManagement.tpm.notificationPreferences.atNotificationPreference(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
