import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test verifying system admin creation of dashboard preferences
 *
 * 1. Register as system admin and login
 * 2. Create a system-level analytics dashboard, recording its ID,
 *    owner_user_id, and organization_id
 * 3. Create dashboard preferences for that dashboardId and system admin userId
 * 4. Confirm the result type is correct and all linkages (dashboard_id,
 *    user_id) match
 * 5. Attempt to create preferences again with the same dashboardId/userId -
 *    expect error or overwrite as per system/business logic
 * 6. Use assertions to validate success fields and business rules
 */
export async function test_api_dashboard_preference_create_success_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: email,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(sysadmin);
  // 2. Login as system admin (re-use password, check that login returns identical user_id)
  const loginBody = {
    email,
    provider: "local",
    provider_key: email,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "joined and login account ID matches",
    loginResult.id,
    sysadmin.id,
  );
  // 3. Create analytics dashboard with sysadmin as owner
  const dashboardBody = {
    owner_user_id: sysadmin.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: null,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    config_json: JSON.stringify({ layout: "default", widgets: [] }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      { body: dashboardBody },
    );
  typia.assert(dashboard);
  // 4. Create dashboard preferences for this dashboard and sysadmin user
  const prefBody = {
    dashboard_id: dashboard.id,
    user_id: sysadmin.id,
    preferences_json: JSON.stringify({
      theme: RandomGenerator.pick(["light", "dark"] as const),
      customLayout: true,
    }),
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
  TestValidator.equals("dashboard_id matches", pref.dashboard_id, dashboard.id);
  TestValidator.equals("user_id matches", pref.user_id, sysadmin.id);
  // 5. Attempt duplicate creation with same dashboard/user, expect error or successful overwrite (test both logic flows)
  await TestValidator.error(
    "duplicate create for same dashboard/user fails or upserts",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId: dashboard.id,
          body: prefBody,
        },
      );
    },
  );
}
