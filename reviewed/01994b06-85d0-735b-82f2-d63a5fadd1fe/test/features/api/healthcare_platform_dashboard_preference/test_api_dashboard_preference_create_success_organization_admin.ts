import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin successfully creates analytics dashboard preference.
 *
 * This test covers the full workflow for an organization admin setting
 * dashboard preferences for a dashboard. Steps:
 *
 * 1. Register organization admin (join)
 * 2. Login as this admin
 * 3. Create a dashboard
 * 4. Create a dashboard preference for this dashboard (user = admin themselves)
 * 5. Assert that returned preference record matches dashboard/user linkage and all
 *    fields
 */
export async function test_api_dashboard_preference_create_success_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "SecureP@ssw0rd!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Login as admin (token set in connection)
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "SecureP@ssw0rd!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Create a dashboard for this org
  const dashboardCreate = {
    owner_user_id: adminJoin.id,
    organization_id: adminJoin.id, // For test isolation; normally org id from admin profile
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 12 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 12,
    }),
    config_json: JSON.stringify({
      widgets: [{ type: "chart", layout: "grid" }],
    }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: dashboardCreate,
      },
    );
  typia.assert(dashboard);

  // 4. Create a dashboard preference for self (admin)
  const prefCreate = {
    dashboard_id: dashboard.id,
    user_id: adminJoin.id,
    preferences_json: JSON.stringify({
      theme: "dark",
      layout: "tabbed",
      filters: [],
    }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const pref =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: prefCreate,
      },
    );
  typia.assert(pref);

  // 5. Assertions: correct linkage and field structure
  TestValidator.equals(
    "preference is tied to correct dashboard",
    pref.dashboard_id,
    dashboard.id,
  );
  TestValidator.equals(
    "preference is tied to correct user",
    pref.user_id,
    adminJoin.id,
  );
  TestValidator.predicate(
    "preferences_json is not empty",
    typeof pref.preferences_json === "string" &&
      pref.preferences_json.length > 0,
  );
}
