import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";

/**
 * This test validates the update functionality of designer notification
 * preferences.
 *
 * It performs:
 *
 * 1. Designer user registration and authentication.
 * 2. Notification preference update with realistic data.
 * 3. Validation of response and enforcement of business rules.
 * 4. Tests permission constraints.
 */
export async function test_api_designer_notification_preferences_update_success(
  connection: api.IConnection,
) {
  // 1. Designer user registration
  const designerEmail = `designer_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const designerPassword = "securePassword123";
  const createBody = {
    email: designerEmail,
    password_hash: designerPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, { body: createBody });
  typia.assert(designer);

  // 2. Designer user login
  const loginBody = {
    email: designerEmail,
    password: designerPassword,
  } satisfies ITaskManagementDesigner.ILogin;
  const loggedInDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, { body: loginBody });
  typia.assert(loggedInDesigner);

  // 3. Prepare update data for notification preferences
  // Using realistic preference keys and delivery methods
  const validPreferenceKeys = [
    "assignment",
    "status_change",
    "comment",
  ] as const;
  const validDeliveryMethods = ["email", "push", "sms"] as const;

  // Here we simulate getting some notification preference ID for the designer
  // Since we don't have a fetch list API, we generate a valid UUID for updating
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // Randomly pick preference key and delivery method
  const newPreferenceKey = RandomGenerator.pick(validPreferenceKeys);
  const newDeliveryMethod = RandomGenerator.pick(validDeliveryMethods);
  const enabledFlag = true;

  const updateBody = {
    preference_key: newPreferenceKey,
    delivery_method: newDeliveryMethod,
    enabled: enabledFlag,
  } satisfies ITaskManagementNotificationPreferences.IUpdate;

  // 4. Update notification preference
  const updatedPreference: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.designer.notificationPreferences.updateNotificationPreference(
      connection,
      {
        id: preferenceId,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);

  // 5. Validate response matches updated data
  TestValidator.equals(
    "updated preference key",
    updatedPreference.preference_key,
    updateBody.preference_key,
  );
  TestValidator.equals(
    "updated delivery method",
    updatedPreference.delivery_method,
    updateBody.delivery_method,
  );
  TestValidator.equals(
    "updated enabled flag",
    updatedPreference.enabled,
    updateBody.enabled,
  );

  // 6. Validate user_id matches logged in designer
  TestValidator.equals(
    "user id matches logged in designer",
    updatedPreference.user_id,
    designer.id,
  );

  // 7. Validate enums for valid delivery method and preference key
  TestValidator.predicate(
    "delivery method is valid enum",
    validDeliveryMethods.includes(updatedPreference.delivery_method as any),
  );
  TestValidator.predicate(
    "preference key is valid enum",
    validPreferenceKeys.includes(updatedPreference.preference_key as any),
  );

  // 8. Negative scenario: Attempt update without authorization (simulate by clearing connection headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("reject update without authorization", async () => {
    await api.functional.taskManagement.designer.notificationPreferences.updateNotificationPreference(
      unauthConnection,
      {
        id: preferenceId,
        body: updateBody,
      },
    );
  });
}
