import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test for dashboard preference update workflow.
 *
 * 1. Register & login system admin (setup org dashboard as precondition)
 * 2. Register & login 1st organization admin
 * 3. System admin creates dashboard for org/user
 * 4. Organization admin logs in, creates dashboard preference linked to dashboard
 * 5. Organization admin updates preference (PUT) – change preferences_json &
 *    last_viewed_at
 * 6. Validate update success: returned preference matches input changes and
 *    persists
 * 7. Try update with missing required fields (must get validation error)
 * 8. Try update with invalid (random) dashboard/preference ID (must get not found)
 * 9. Register & login 2nd org admin, try to update 1st admin's preference (must
 *    fail with forbidden)
 */
export async function test_api_organization_admin_dashboard_preference_update_full_workflow(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdmin_test_pw_1",
    },
  });
  typia.assert(sysAdminJoin);

  // Login as system admin (refresh token if needed)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdmin_test_pw_1",
    },
  });

  // 2. Register organization admin #1
  const orgAdminEmail1 = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin1 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail1,
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        password: "OrgAdmin_test_pw_1",
      },
    },
  );
  typia.assert(orgAdminJoin1);

  // 3. Create dashboard as system admin (for organization–> using orgAdminJoin1 info)
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: orgAdminJoin1.id,
          organization_id: typia.random<
            string & tags.Format<"uuid">
          >() /* (simulate org id) */,
          department_id: null,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 7 }),
          config_json: JSON.stringify({
            layout: "A",
            widgets: ["chart", "list"],
          }),
          is_public: true,
        },
      },
    );
  typia.assert(dashboard);

  // 4. Login as org admin #1 (context switch)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail1,
      password: "OrgAdmin_test_pw_1",
    },
  });

  // 5. Create dashboard preference as org admin for this dashboard
  const pref =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: orgAdminJoin1.id,
          preferences_json: JSON.stringify({
            theme: "light",
            widgets: ["chart", "list"],
          }),
        },
      },
    );
  typia.assert(pref);

  // 6. Update dashboard preference (PUT – change preferences_json & last_viewed_at)
  const newPrefs = JSON.stringify({ theme: "dark", widgets: ["map"] });
  const newLastViewedAt = new Date().toISOString();
  const updatedPref =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: pref.id,
        body: {
          preferences_json: newPrefs,
          last_viewed_at: newLastViewedAt,
        },
      },
    );
  typia.assert(updatedPref);
  TestValidator.equals(
    "preference preferences_json updated",
    updatedPref.preferences_json,
    newPrefs,
  );
  TestValidator.equals(
    "preference last_viewed_at updated",
    updatedPref.last_viewed_at,
    newLastViewedAt,
  );

  // 7. Edge case: update with missing required field (should error)
  await TestValidator.error(
    "should error on missing body (update)",
    async () => {
      // preferences_json and last_viewed_at are both optional: if both omitted, nothing changes (simulate invalid or empty body)
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: pref.id,
          body: {},
        },
      );
    },
  );

  // 8. Edge case: update with invalid dashboard/preference IDs
  await TestValidator.error("invalid dashboardId fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: typia.random<string & tags.Format<"uuid">>(),
        preferenceId: pref.id,
        body: { preferences_json: "{}" },
      },
    );
  });
  await TestValidator.error("invalid preferenceId fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: typia.random<string & tags.Format<"uuid">>(),
        body: { preferences_json: JSON.stringify({ choice: "fail" }) },
      },
    );
  });

  // 9. Register & login a second org admin, and test access control
  const orgAdminEmail2 = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail2,
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        password: "OrgAdmin_test_pw_2",
      },
    },
  );
  typia.assert(orgAdminJoin2);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail2,
      password: "OrgAdmin_test_pw_2",
    },
  });

  await TestValidator.error(
    "second admin cannot update first admin's preference",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: pref.id,
          body: { preferences_json: JSON.stringify({ theme: "blocked" }) },
        },
      );
    },
  );
}
