import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Scenario: Test updating a notification preference as org admin.
 *
 * 1. Register a system admin and login.
 * 2. Register an organization admin and login.
 * 3. As system admin, create a notification preference for the org admin's user id
 *    and organization (random, but linked via org admin info if available)
 *    using POST /healthcarePlatform/systemAdmin/notificationPreferences.
 * 4. As org admin (login), update the created notification preference with valid
 *    data, changing the enabled state, setting a mute window, or escalation
 *    policy, via PUT
 *    /healthcarePlatform/organizationAdmin/notificationPreferences/{notificationPreferenceId}.
 * 5. Validate the update's response matches the request and has the correct id and
 *    updated fields.
 * 6. Attempt to perform an update using invalid or unauthorized data (e.g.,
 *    unauthorized escalation_policy string or invalid mute window logic) and
 *    assert the correct error is thrown (business logic error, not type
 *    error).
 */
export async function test_api_notification_preference_update_by_org_admin(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = "SysAdmin123!";
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdmin);

  // 2. Organization admin registration and login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "OrgAdmin123!";
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdmin);

  // 3. As systemAdmin, create a notification preference for orgAdmin's user_id
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  const prefCreate = {
    user_id: orgAdmin.id,
    organization_id: undefined, // could be set if org info is known
    notification_channel: "email",
    notification_type: RandomGenerator.pick([
      "appointment_reminder",
      "billing_alert",
    ]),
    enabled: true,
    mute_start: null,
    mute_end: null,
    escalation_policy: null,
  } satisfies IHealthcarePlatformNotificationPreference.ICreate;
  const createdPref =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.create(
      connection,
      { body: prefCreate },
    );
  typia.assert(createdPref);

  // 4. As orgAdmin, login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // 5. Successful update: enable -> disable + set mute window and escalation_policy
  const now = new Date();
  const muteStart = new Date(now.getTime() + 1000 * 60 * 60 * 1).toISOString();
  const muteEnd = new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString();
  const updatedPrefReq = {
    enabled: false,
    mute_start: muteStart,
    mute_end: muteEnd,
    escalation_policy: "urgent-only",
  } satisfies IHealthcarePlatformNotificationPreference.IUpdate;
  const updatedPref =
    await api.functional.healthcarePlatform.organizationAdmin.notificationPreferences.update(
      connection,
      {
        notificationPreferenceId: createdPref.id,
        body: updatedPrefReq,
      },
    );
  typia.assert(updatedPref);
  TestValidator.equals(
    "notification preference id unchanged after update",
    updatedPref.id,
    createdPref.id,
  );
  TestValidator.equals(
    "notification preference enabled state updated",
    updatedPref.enabled,
    false,
  );
  TestValidator.equals(
    "notification preference mute_start updated",
    updatedPref.mute_start,
    muteStart,
  );
  TestValidator.equals(
    "notification preference mute_end updated",
    updatedPref.mute_end,
    muteEnd,
  );
  TestValidator.equals(
    "notification preference escalation_policy updated",
    updatedPref.escalation_policy,
    "urgent-only",
  );

  // 6. Failure scenario: Try to update with forbidden escalation_policy value
  await TestValidator.error(
    "update with forbidden escalation_policy value should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.notificationPreferences.update(
        connection,
        {
          notificationPreferenceId: createdPref.id,
          body: {
            escalation_policy: "nonexistent-policy",
          },
        },
      );
    },
  );
}
