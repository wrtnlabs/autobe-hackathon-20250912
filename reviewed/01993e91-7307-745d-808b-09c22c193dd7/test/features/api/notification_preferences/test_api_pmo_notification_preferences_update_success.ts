import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Comprehensive test for updating Project Management Officer (PMO)
 * notification preferences.
 *
 * This test simulates the full authenticated lifecycle:
 *
 * 1. PMO user registration (join) with valid email, password, and name.
 * 2. PMO user login to obtain authentication tokens.
 * 3. Simulating retrieval of an existing notification preference record.
 * 4. Updating the notification preference with valid fields (enabled,
 *    delivery_method, preference_key).
 * 5. Validating the update response ensuring the fields were modified as
 *    intended.
 *
 * All API calls are correctly awaited, with strict type validation using
 * typia.assert. Business logic assertions verify consistency of updated
 * data. No invalid data or non-existent properties are used.
 *
 * Authentication token handling is internal to SDK; no header manipulation
 * occurs.
 */
export async function test_api_pmo_notification_preferences_update_success(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;

  const authorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. PMO user login
  const loginBody = {
    email: authorized.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const loginAuthorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);

  // 3. Retrieve existing notification preference (simulated)
  const existingPreference =
    typia.random<ITaskManagementNotificationPreferences>();

  // 4. Prepare update body with valid fields, respecting nullable/optional properties
  const updateBody = {
    enabled:
      existingPreference.enabled === undefined
        ? true
        : !existingPreference.enabled,
    delivery_method: RandomGenerator.pick(["email", "push", "sms"] as const),
    preference_key: existingPreference.preference_key ?? "assignment",
  } satisfies ITaskManagementNotificationPreferences.IUpdate;

  // 5. Perform update API call
  const updatedPreference =
    await api.functional.taskManagement.pmo.notificationPreferences.updateNotificationPreference(
      connection,
      {
        id: existingPreference.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);

  // 6. Validate returned updated preference
  TestValidator.equals(
    "preference id unchanged",
    updatedPreference.id,
    existingPreference.id,
  );
  TestValidator.equals(
    "enabled flag updated",
    updatedPreference.enabled,
    updateBody.enabled ?? existingPreference.enabled,
  );
  TestValidator.equals(
    "delivery method updated",
    updatedPreference.delivery_method,
    updateBody.delivery_method ?? existingPreference.delivery_method,
  );
  TestValidator.equals(
    "preference key updated or unchanged",
    updatedPreference.preference_key,
    updateBody.preference_key ?? existingPreference.preference_key,
  );
}
