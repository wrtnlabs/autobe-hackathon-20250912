import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDashboardPreference";

/**
 * Test updating dashboard preferences for a specific analytics dashboard as an
 * organization admin.
 *
 * Steps:
 *
 * 1. Create and log in as an organization admin
 * 2. Create an analytics dashboard (and keep dashboardId)
 * 3. Create dashboard preferences for (admin user, dashboardId) with initial JSON
 * 4. (NOTE: No PATCH/update is possible, only query supported with provided API)
 *    Query the preferences for validations
 * 5. Retrieve dashboard preferences scoped by user and dashboardId with a filter,
 *    verify preference exists
 * 6. Assert preferences are only visible for correct user/dashboard combo
 * 7. (Business rule) Negative: ensure another user acting as org admin cannot view
 *    the preferences for the original user (should fail)
 */
export async function test_api_analytics_dashboard_preference_patch_organization_admin(
  connection: api.IConnection,
) {
  // 1. Create and login as org admin
  const orgEmail: string = typia.random<string & tags.Format<"email">>();
  const orgName: string = RandomGenerator.name();
  const orgPassword: string = RandomGenerator.alphaNumeric(16);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgEmail,
        full_name: orgName,
        password: orgPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  // Login again to set token (join probably does it, but test login anyway)
  const orgAdminLogin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgEmail,
        password: orgPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
  typia.assert(orgAdminLogin);

  // 2. Create analytics dashboard
  const dashboardCreate = {
    owner_user_id: orgAdminLogin.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    config_json: JSON.stringify({ layout: "default" }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard: IHealthcarePlatformAnalyticsDashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: dashboardCreate,
      },
    );
  typia.assert(dashboard);

  // 3. Create dashboard preferences for (user: org admin)
  const initialPreference = {
    dashboard_id: dashboard.id,
    user_id: orgAdminLogin.id,
    preferences_json: JSON.stringify({ theme: "light", filter: "recent" }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const preference: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: initialPreference,
      },
    );
  typia.assert(preference);
  TestValidator.equals(
    "created preference's user matches org admin",
    preference.user_id,
    orgAdminLogin.id,
  );
  TestValidator.equals(
    "created preference's dashboard matches dashboard",
    preference.dashboard_id,
    dashboard.id,
  );

  // 4. NOTE: No PATCH/update for preferences with provided API, so proceed to index/query for validation

  // 5. Retrieve and verify preference is returned
  const result: IPageIHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.index(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: orgAdminLogin.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "Dashboard preference index filter by (dashboard, user)",
    result.data.length,
    1,
  );
  const gotPreference = result.data[0];
  TestValidator.equals(
    "Dashboard preference user_id matches",
    gotPreference.user_id,
    orgAdminLogin.id,
  );
  TestValidator.equals(
    "Dashboard preference dashboard_id matches",
    gotPreference.dashboard_id,
    dashboard.id,
  );
  TestValidator.equals(
    "Dashboard preference preferences_json matches initial",
    gotPreference.preferences_json,
    initialPreference.preferences_json,
  );

  // 6. Negative: another admin cannot retrieve this user's preference
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(12);
  const otherAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: otherEmail,
        full_name: RandomGenerator.name(),
        password: otherPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(otherAdmin);
  // Switch session to second admin with correct password
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherEmail,
      password: otherPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "Other org admin cannot access another user's preference records",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.index(
        connection,
        {
          dashboardId: dashboard.id,
          body: {
            dashboard_id: dashboard.id,
            user_id: orgAdminLogin.id,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          },
        },
      );
    },
  );
}
