import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotificationPreference";

/**
 * Validate that a system admin can search for notification preferences by user
 * and organization.
 *
 * 1. Register a system admin with business details.
 * 2. Log in as the registered admin (redundant for most flows but illustrates
 *    correct token flow).
 * 3. Create a notification preference as precondition with known user_id and
 *    organization_id.
 * 4. Use PATCH (index) API to find by user_id and/or org_id, with filtering on
 *    notification_channel and notification_type.
 * 5. Assert the returned data includes the created preference; typia.assert for
 *    type validation.
 * 6. Test search with non-existent IDs.
 * 7. Test search as unauthorized (unauthenticated) context.
 */
export async function test_api_notification_preferences_search_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Create a system admin (requires email, full_name, provider, provider_key, password)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: "StrongP@ssw0rd!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. System admin login (provider: local)
  const loginOutput = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "StrongP@ssw0rd!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginOutput);

  // 3. Pre-create notification preference for user (admin's id)
  const pref =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.create(
      connection,
      {
        body: {
          user_id: admin.id,
          notification_channel: RandomGenerator.pick([
            "email",
            "sms",
            "in_app",
          ] as const),
          notification_type: "platform_alert",
          enabled: true,
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          mute_start: null,
          mute_end: null,
          escalation_policy: null,
        } satisfies IHealthcarePlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(pref);

  // 4. Search by user_id
  const resByUser =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.index(
      connection,
      {
        body: {
          user_id: admin.id,
          page: 1,
          pageSize: 10,
        } satisfies IHealthcarePlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(resByUser);
  TestValidator.predicate(
    "at least one notification preference for admin user",
    resByUser.data.length > 0,
  );
  TestValidator.equals(
    "response contains the pre-created preference (by user_id)",
    resByUser.data.find((x) => x.id === pref.id)?.user_id,
    admin.id,
  );

  // 5. Search by org id
  const resByOrg =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.index(
      connection,
      {
        body: {
          organization_id: pref.organization_id,
          page: 1,
          pageSize: 10,
        } satisfies IHealthcarePlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(resByOrg);
  TestValidator.predicate(
    "at least one notification preference for organization",
    resByOrg.data.length > 0,
  );

  // 6. Search with both user_id and org_id (should match filtered)
  const resByBoth =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.index(
      connection,
      {
        body: {
          user_id: admin.id,
          organization_id: pref.organization_id,
          page: 1,
          pageSize: 10,
        } satisfies IHealthcarePlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(resByBoth);
  TestValidator.equals(
    "response contains the pre-created preference (by user_id & org_id)",
    resByBoth.data[0].id,
    pref.id,
  );

  // 7. Filtering test: notification_channel
  const resByChannel =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.index(
      connection,
      {
        body: {
          notification_channel: pref.notification_channel,
          page: 1,
          pageSize: 10,
        } satisfies IHealthcarePlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(resByChannel);
  TestValidator.predicate(
    "channel filter returns at least one matching preference",
    resByChannel.data.some((x) => x.id === pref.id),
  );

  // 8. Error: search with non-existent user_id (valid uuid, not present)
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const resEmptyUser =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.index(
      connection,
      {
        body: {
          user_id: nonExistentUserId,
          page: 1,
          pageSize: 10,
        } satisfies IHealthcarePlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(resEmptyUser);
  TestValidator.equals(
    "no preference found for non-existent user",
    resEmptyUser.data.length,
    0,
  );

  // 9. Error: search with non-existent organization_id
  const nonExistentOrgId = typia.random<string & tags.Format<"uuid">>();
  const resEmptyOrg =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.index(
      connection,
      {
        body: {
          organization_id: nonExistentOrgId,
          page: 1,
          pageSize: 10,
        } satisfies IHealthcarePlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(resEmptyOrg);
  TestValidator.equals(
    "no preference found for non-existent organization",
    resEmptyOrg.data.length,
    0,
  );

  // 10. Error: unauthorized/unauthenticated (simulate by removing header, if allowed by SDK)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated context is forbidden from searching notification preferences",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.index(
        unauthConn,
        {
          body: {
            page: 1,
            pageSize: 10,
          } satisfies IHealthcarePlatformNotificationPreference.IRequest,
        },
      );
    },
  );
}
