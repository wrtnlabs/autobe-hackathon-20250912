import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * System admin dashboard preference lifecycle and update validation test.
 *
 * This test models a full E2E workflow for the lifecycle of updating
 * dashboard preferences by a platform system administrator. It covers
 * creation of an admin account, dashboard creation, preference setup,
 * update, and relevant access control error cases.
 *
 * Steps:
 *
 * 1. Register system admin user (join).
 * 2. Login as system admin (to validate session validity and ensure headers
 *    are set).
 * 3. Create a new analytics dashboard under this admin's identity.
 * 4. Create an initial dashboard preference for this dashboard and admin.
 * 5. Perform a valid preference update (PUT) with a new preferences_json and
 *    last_viewed_at now.
 * 6. Check response reflects latest data, correct links, and updated audit
 *    fields.
 * 7. Register another independent admin, login as them, and attempt to update
 *    the first admin's preference—expect access control error.
 */
export async function test_api_system_admin_dashboard_preference_update_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register admin and login
  const joinAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: joinAdminBody,
  });
  typia.assert(adminAuth);

  // 2. Redundant login to check session refresh/auth
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinAdminBody.email,
      provider: joinAdminBody.provider,
      provider_key: joinAdminBody.provider_key,
      password: joinAdminBody.password,
    },
  });

  // 3. Create analytics dashboard
  const dashboardBody = {
    owner_user_id: adminAuth.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    config_json: JSON.stringify({ widgets: [], layout: "default" }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      { body: dashboardBody },
    );
  typia.assert(dashboard);
  TestValidator.equals(
    "dashboard owner_user_id match",
    dashboard.owner_user_id,
    adminAuth.id,
  );

  // 4. Create dashboard preference
  const prefBody = {
    dashboard_id: dashboard.id,
    user_id: adminAuth.id,
    preferences_json: JSON.stringify({ theme: "light", widgets: ["w1"] }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const pref =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: prefBody,
      },
    );
  typia.assert(pref);
  TestValidator.equals("preference user_id", pref.user_id, adminAuth.id);

  // 5. Update preference (PUT)
  const newPrefsVal = {
    theme: "dark",
    layout: "new_grid",
    widgets: ["w2", "w3"],
  };
  const now = new Date().toISOString();
  const updateBody = {
    preferences_json: JSON.stringify(newPrefsVal),
    last_viewed_at: now,
  } satisfies IHealthcarePlatformDashboardPreference.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: pref.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "preference update applied",
    updated.preferences_json,
    updateBody.preferences_json,
  );
  TestValidator.equals("last_viewed_at updated", updated.last_viewed_at, now);
  TestValidator.equals("user link remains", updated.user_id, adminAuth.id);
  TestValidator.equals(
    "dashboard link remains",
    updated.dashboard_id,
    dashboard.id,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    pref.updated_at,
  );

  // 6. Switch to another admin account and attempt unauthorized update
  const joinAdmin2Body = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin2Auth = await api.functional.auth.systemAdmin.join(connection, {
    body: joinAdmin2Body,
  });
  typia.assert(admin2Auth);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinAdmin2Body.email,
      provider: joinAdmin2Body.provider,
      provider_key: joinAdmin2Body.provider_key,
      password: joinAdmin2Body.password,
    },
  });
  await TestValidator.error(
    "Non-owner admin cannot update other's preference",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: pref.id,
          body: updateBody,
        },
      );
    },
  );
}
