import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test: Retrieve notification preference by ID as system admin, and
 * validate error on non-existent ID.
 *
 * 1. Register system admin (admin join)
 * 2. Create a notification preference (using notificationPreferences.create)
 * 3. Retrieve preference by ID as admin (notificationPreferences.at)
 *
 *    - Validate that all returned details match the created record and are valid
 *         by schema
 * 4. Try retrieving by a random non-existent ID
 *
 *    - Assert API returns an error
 */
export async function test_api_notification_preference_retrieve_by_id_success(
  connection: api.IConnection,
) {
  // 1. Register system admin & authenticate
  const sysAdminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdminJoin);

  // 2. Create notification preference (mock user_id, optionally organization_id)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const preferenceCreate = {
    user_id: userId,
    notification_channel: RandomGenerator.pick([
      "email",
      "sms",
      "in_app",
    ] as const),
    notification_type: RandomGenerator.paragraph({ sentences: 2 }),
    enabled: true,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    mute_start: null,
    mute_end: null,
    escalation_policy: null,
  } satisfies IHealthcarePlatformNotificationPreference.ICreate;

  const created: IHealthcarePlatformNotificationPreference =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.create(
      connection,
      {
        body: preferenceCreate,
      },
    );
  typia.assert(created);

  // 3. Retrieve preference by ID
  const fetched: IHealthcarePlatformNotificationPreference =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.at(
      connection,
      {
        notificationPreferenceId: created.id,
      },
    );
  typia.assert(fetched);

  // Validate all fields match inputs (where applicable)
  TestValidator.equals("id matches", fetched.id, created.id);
  TestValidator.equals(
    "user id matches",
    fetched.user_id,
    preferenceCreate.user_id,
  );
  TestValidator.equals(
    "org id matches",
    fetched.organization_id,
    preferenceCreate.organization_id,
  );
  TestValidator.equals(
    "notification channel matches",
    fetched.notification_channel,
    preferenceCreate.notification_channel,
  );
  TestValidator.equals(
    "notification type matches",
    fetched.notification_type,
    preferenceCreate.notification_type,
  );
  TestValidator.equals(
    "enabled matches",
    fetched.enabled,
    preferenceCreate.enabled,
  );
  TestValidator.equals(
    "mute_start matches",
    fetched.mute_start,
    preferenceCreate.mute_start,
  );
  TestValidator.equals(
    "mute_end matches",
    fetched.mute_end,
    preferenceCreate.mute_end,
  );
  TestValidator.equals(
    "escalation_policy matches",
    fetched.escalation_policy,
    preferenceCreate.escalation_policy,
  );

  // 4. Attempt to retrieve by random non-existent ID (should error)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw on non-existent notification preference ID",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.at(
        connection,
        { notificationPreferenceId: nonExistentId },
      );
    },
  );
}
