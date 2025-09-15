import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";

/**
 * This E2E test validates the successful update of developer notification
 * preferences according to the following process:
 *
 * 1. Register a new developer user with /auth/developer/join using proper fields.
 * 2. Log in as the registered developer to obtain authentication tokens.
 * 3. Generate a valid notification preference ID (mocked as a random UUID),
 *    assuming ownership for testing.
 * 4. Update the notification preference with a valid enabled boolean and a valid
 *    delivery method string.
 * 5. Validate the updated notification preference reflects those changes
 *    correctly.
 * 6. Validate authorization failure by attempting update without authentication,
 *    expecting errors.
 *
 * The test ensures type safety, correct usage of DTOs, proper token handling,
 * and comprehensive validation of business logic and security.
 */
export async function test_api_developer_notification_preferences_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register developer user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(10);
  const name: string = RandomGenerator.name(2);
  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email,
        password_hash: password,
        name,
      } satisfies ITaskManagementDeveloper.ICreate,
    });
  typia.assert(developer);

  // Step 2: Login developer to authenticate
  const login: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email,
        password,
      } satisfies ITaskManagementDeveloper.ILogin,
    });
  typia.assert(login);

  // Step 3: Generate valid notification preference ID (mocked assumption)
  const preferenceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Prepare update payload
  const enabled: boolean = true;
  const deliveryMethods = ["email", "push", "sms"] as const;
  const delivery_method: (typeof deliveryMethods)[number] =
    RandomGenerator.pick(deliveryMethods);
  const updateBody = {
    enabled,
    delivery_method,
  } satisfies ITaskManagementNotificationPreferences.IUpdate;

  // Step 5: Update notification preference
  const updatedPreference: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.developer.notificationPreferences.updateNotificationPreference(
      connection,
      {
        id: preferenceId,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);

  // Validate updated fields
  TestValidator.equals(
    "Updated preference enabled matches",
    updatedPreference.enabled,
    enabled,
  );
  TestValidator.equals(
    "Updated preference delivery method matches",
    updatedPreference.delivery_method,
    delivery_method,
  );

  // Step 6: Authorization failure - unauthenticated update
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized update attempt without auth",
    async () => {
      await api.functional.taskManagement.developer.notificationPreferences.updateNotificationPreference(
        unauthenticatedConnection,
        {
          id: preferenceId,
          body: updateBody,
        },
      );
    },
  );
}
