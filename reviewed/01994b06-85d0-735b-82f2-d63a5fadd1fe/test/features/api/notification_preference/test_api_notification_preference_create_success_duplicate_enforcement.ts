import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate creation and duplicate enforcement of notification preferences
 * by a system admin.
 *
 * This test verifies that:
 *
 * 1. A system admin can create a notification preference for a user (with
 *    specified channel, type, etc.) by sending POST
 *    /healthcarePlatform/systemAdmin/notificationPreferences.
 * 2. When creating with the same user_id, organization_id, channel, and
 *    notification_type again, the server enforces uniqueness and returns an
 *    error.
 *
 * The test consists of:
 *
 * 1. Creating (joining) a system admin and using their session.
 * 2. Defining a unique notification preference for a fake/test user (random
 *    user_id and organization_id or undefined) with random values for
 *    notification_channel and notification_type and options.
 * 3. Creating the preference (expect success), validating response fields and
 *    value matching.
 * 4. Attempting to create the exact same preference again (expect business
 *    error: duplicate/conflict).
 * 5. The test is successful if the first call is successful and the second
 *    call triggers the server's uniqueness check.
 */
export async function test_api_notification_preference_create_success_duplicate_enforcement(
  connection: api.IConnection,
) {
  // 1. Register a new system admin (establish admin session)
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);

  // 2. Build notification preference creation request (unique triple)
  const preferenceInput = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    notification_channel: RandomGenerator.pick([
      "email",
      "sms",
      "in_app",
    ] as const),
    notification_type: RandomGenerator.pick([
      "appointment_reminder",
      "billing_alert",
      "test_result",
    ] as const),
    enabled: true,
    mute_start: null,
    mute_end: null,
    escalation_policy: null,
  } satisfies IHealthcarePlatformNotificationPreference.ICreate;

  // 3. Admin creates the notification preference
  const created =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.create(
      connection,
      { body: preferenceInput },
    );
  typia.assert(created);
  // Validate returned object
  TestValidator.equals(
    "preference user_id matches",
    created.user_id,
    preferenceInput.user_id,
  );
  TestValidator.equals(
    "preference organization_id matches",
    created.organization_id,
    preferenceInput.organization_id,
  );
  TestValidator.equals(
    "preference channel matches",
    created.notification_channel,
    preferenceInput.notification_channel,
  );
  TestValidator.equals(
    "preference type matches",
    created.notification_type,
    preferenceInput.notification_type,
  );
  TestValidator.equals(
    "preference enabled state matches",
    created.enabled,
    preferenceInput.enabled,
  );
  TestValidator.equals(
    "preference escalation_policy matches",
    created.escalation_policy,
    preferenceInput.escalation_policy,
  );
  TestValidator.equals(
    "preference mute_start matches",
    created.mute_start,
    preferenceInput.mute_start,
  );
  TestValidator.equals(
    "preference mute_end matches",
    created.mute_end,
    preferenceInput.mute_end,
  );

  // 4. Attempt to create the identical notification preference again, trigger duplicate error
  await TestValidator.error(
    "creating duplicate notification preference fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.create(
        connection,
        { body: preferenceInput },
      );
    },
  );
}
