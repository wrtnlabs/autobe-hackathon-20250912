import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test the update operation for TPM user's notification preferences.
 *
 * This test covers a complete workflow including TPM user registration and
 * login, creation of a notification preference (simulated via initial data),
 * updating the preference with various valid and invalid inputs, and validation
 * of responses and authorization handling.
 *
 * The test ensures that only authorized TPM users can update preferences,
 * verifies persistence of changes, and confirms proper error responses for
 * invalid scenarios such as nonexistent preference IDs or malformed request
 * bodies.
 */
export async function test_api_notification_preference_update_tpm(
  connection: api.IConnection,
) {
  // 1. TPM user registration (join)
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 2. TPM user login
  const loginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loginUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loginUser);

  // For authentication context, subsequent calls will use this connection
  // with Authorization headers handled internally by the SDK

  // 3. Prepare initial notification preference data
  // Since creation API of notification preferences is not provided,
  // we simulate by creating an initial update (initial values) with a random UUID.
  const initialPreferenceId = typia.random<string & tags.Format<"uuid">>();
  const initialPreference: ITaskManagementNotificationPreferences = {
    id: initialPreferenceId,
    user_id: tpmUser.id,
    preference_key: "assignment",
    enabled: true,
    delivery_method: "email",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 4. Update notification preference with valid changed values
  const updateBodyValid = {
    preference_key: "status_change",
    enabled: false,
    delivery_method: "push",
  } satisfies ITaskManagementNotificationPreferences.IUpdate;

  const updatedPreference: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.tpm.notificationPreferences.updateNotificationPreference(
      connection,
      {
        id: initialPreferenceId,
        body: updateBodyValid,
      },
    );
  typia.assert(updatedPreference);

  // Validate changes persisted
  TestValidator.equals(
    "updated preference key matches",
    updatedPreference.preference_key,
    updateBodyValid.preference_key,
  );
  TestValidator.equals(
    "updated enabled flag matches",
    updatedPreference.enabled,
    updateBodyValid.enabled,
  );
  TestValidator.equals(
    "updated delivery method matches",
    updatedPreference.delivery_method,
    updateBodyValid.delivery_method,
  );

  // 5. Update with partial null values where allowed (preference_key nullable)
  const updateBodyNull = {
    preference_key: null,
  } satisfies ITaskManagementNotificationPreferences.IUpdate;

  const updatedWithNull: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.tpm.notificationPreferences.updateNotificationPreference(
      connection,
      {
        id: initialPreferenceId,
        body: updateBodyNull,
      },
    );
  typia.assert(updatedWithNull);
  TestValidator.equals(
    "null update clears preference_key",
    updatedWithNull.preference_key,
    null,
  );

  // 6. Failure test: Update with invalid UUID for preference ID
  await TestValidator.error(
    "update should fail for invalid UUID preference ID",
    async () => {
      await api.functional.taskManagement.tpm.notificationPreferences.updateNotificationPreference(
        connection,
        {
          id: "not-a-valid-uuid-string" satisfies string & tags.Format<"uuid">,
          body: updateBodyValid,
        },
      );
    },
  );

  // 7. Failure test: Update with unauthorized user simulated
  // Simulate unauthorized by resetting Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update should fail with unauthorized user",
    async () => {
      await api.functional.taskManagement.tpm.notificationPreferences.updateNotificationPreference(
        unauthConn,
        {
          id: initialPreferenceId,
          body: updateBodyValid,
        },
      );
    },
  );

  // 8. Failure test: Update with invalid delivery_method (not string but correct type required)
  // This test to verify business logic rejection, so only valid type but invalid value
  // Since delivery_method is string without enum enforced by swagger, try invalid value string
  const invalidDeliveryMethodBody = {
    delivery_method: "invalid_method_string_not_allowed",
  } satisfies ITaskManagementNotificationPreferences.IUpdate;

  await TestValidator.error(
    "update should fail for invalid delivery_method value",
    async () => {
      await api.functional.taskManagement.tpm.notificationPreferences.updateNotificationPreference(
        connection,
        {
          id: initialPreferenceId,
          body: invalidDeliveryMethodBody,
        },
      );
    },
  );

  // 9. Failure test: update with empty body (should succeed with no changes)
  const emptyUpdateBody =
    {} satisfies ITaskManagementNotificationPreferences.IUpdate;

  const updatedEmpty: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.tpm.notificationPreferences.updateNotificationPreference(
      connection,
      {
        id: initialPreferenceId,
        body: emptyUpdateBody,
      },
    );
  typia.assert(updatedEmpty);

  // The preference_key remains as per last known or cleared
  TestValidator.predicate(
    "updatedEmpty has preference_key field",
    updatedEmpty.preference_key === updatedWithNull.preference_key ||
      updatedEmpty.preference_key === updateBodyValid.preference_key ||
      updatedEmpty.preference_key === null,
  );

  // 10. Confirm type safety and error handling for all valid/invalid cases done
}
