import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Test updating a Project Manager's notification preferences successfully,
 * covering user creation, authentication, preference update with valid data,
 * validation of response, and error scenarios for invalid inputs.
 */
export async function test_api_pm_notification_preferences_update_success(
  connection: api.IConnection,
) {
  // 1. Create a Project Manager (PM) user
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validpassword123",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPm.ICreate;

  const pmCreated: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmCreated);

  // 2. Authenticate as the created PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmAuth: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmAuth);

  // 3. Assign an existing notification preference ID for this PM
  // Since there is no list API for notification preferences in the materials,
  // we simulate obtaining a notification preference ID belonging to this user.
  // We use a new random UUID for id as placeholder. In practice, you'd fetch it.
  const existingPreferenceId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare valid update data with allowed preference_key and delivery_method
  // Based on the description, valid preference keys might be 'assignment', 'status_change', 'comment'
  // Delivery methods might be 'email', 'push', 'sms'
  // Since the schema only specifies string, but description suggests these enums
  // We'll pick from these known valid keys and methods

  const validPreferenceKeys = [
    "assignment",
    "status_change",
    "comment",
  ] as const;
  const validDeliveryMethods = ["email", "push", "sms"] as const;

  // Select random valid keys and delivery methods
  const newPreferenceKey = RandomGenerator.pick(validPreferenceKeys);
  const newDeliveryMethod = RandomGenerator.pick(validDeliveryMethods);

  const updateBody = {
    preference_key: newPreferenceKey,
    enabled: true, // enable this preference
    delivery_method: newDeliveryMethod,
  } satisfies ITaskManagementNotificationPreferences.IUpdate;

  // 5. Update the notification preference
  const updatedPreference: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.pm.notificationPreferences.updateNotificationPreference(
      connection,
      {
        id: existingPreferenceId,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);

  // 6. Verify the update response fields
  TestValidator.equals(
    "updated preference id matches",
    updatedPreference.id,
    existingPreferenceId,
  );
  TestValidator.equals(
    "user_id matches authenticated PM id",
    updatedPreference.user_id,
    pmAuth.id,
  );
  TestValidator.equals(
    "preference_key was updated",
    updatedPreference.preference_key,
    newPreferenceKey,
  );
  TestValidator.equals(
    "enabled status was updated",
    updatedPreference.enabled,
    true,
  );
  TestValidator.equals(
    "delivery_method was updated",
    updatedPreference.delivery_method,
    newDeliveryMethod,
  );

  // 7. Test error scenarios - invalid preference_key
  await TestValidator.error(
    "update with invalid preference_key should fail",
    async () => {
      await api.functional.taskManagement.pm.notificationPreferences.updateNotificationPreference(
        connection,
        {
          id: existingPreferenceId,
          body: {
            preference_key: "invalid_key",
          } satisfies ITaskManagementNotificationPreferences.IUpdate,
        },
      );
    },
  );

  // 8. Test error scenarios - invalid delivery_method
  await TestValidator.error(
    "update with invalid delivery_method should fail",
    async () => {
      await api.functional.taskManagement.pm.notificationPreferences.updateNotificationPreference(
        connection,
        {
          id: existingPreferenceId,
          body: {
            delivery_method: "invalid_delivery",
          } satisfies ITaskManagementNotificationPreferences.IUpdate,
        },
      );
    },
  );
}
