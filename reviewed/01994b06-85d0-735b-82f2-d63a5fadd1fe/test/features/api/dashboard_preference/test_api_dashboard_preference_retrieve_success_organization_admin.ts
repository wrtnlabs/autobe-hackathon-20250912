import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin can create a dashboard, create dashboard
 * preference, and successfully retrieve it. Also verifies that retrieving a
 * dashboard preference from another organization admin fails with a permission
 * error.
 *
 * 1. Register and log in as organization admin A (store credentials)
 * 2. Create a dashboard as admin A
 * 3. Create dashboard preference for that dashboard as admin A
 * 4. Retrieve that dashboard preference as admin A and confirm fields match
 * 5. Register and log in as organization admin B (different org, different
 *    credentials)
 * 6. Attempt to access admin A's dashboard preference as admin B, expect
 *    permission error
 */
export async function test_api_dashboard_preference_retrieve_success_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register organization admin A
  const adminA_email = typia.random<string & tags.Format<"email">>();
  const adminA_fullName = RandomGenerator.name();
  const adminA_password = RandomGenerator.alphaNumeric(10);

  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminA_email,
        full_name: adminA_fullName,
        password: adminA_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminA);

  // 2. Create dashboard as admin A
  const dashboard: IHealthcarePlatformAnalyticsDashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: adminA.id,
          organization_id: adminA.id, // Organization ID; for test, match admin's UUID
          title: RandomGenerator.paragraph({ sentences: 2 }),
          config_json: JSON.stringify({
            widgets: [RandomGenerator.paragraph({ sentences: 1 })],
          }),
          is_public: true,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 3. Create dashboard preference for admin A on the dashboard
  const prefPayload = {
    dashboard_id: dashboard.id,
    user_id: adminA.id,
    preferences_json: JSON.stringify({ theme: "dark", layout: "wide" }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const pref: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: prefPayload,
      },
    );
  typia.assert(pref);

  // 4. Retrieve dashboard preference as admin A and confirm
  const retrieved: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.at(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: pref.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "dashboard preference dashboard_id matches",
    retrieved.dashboard_id,
    prefPayload.dashboard_id,
  );
  TestValidator.equals(
    "dashboard preference user_id matches",
    retrieved.user_id,
    prefPayload.user_id,
  );
  TestValidator.equals(
    "dashboard preference JSON payload matches",
    retrieved.preferences_json,
    prefPayload.preferences_json,
  );

  // 5. Register organization admin B (different org, separate credentials)
  const adminB_email = typia.random<string & tags.Format<"email">>();
  const adminB_fullName = RandomGenerator.name();
  const adminB_password = RandomGenerator.alphaNumeric(12);
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminB_email,
        full_name: adminB_fullName,
        password: adminB_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminB);

  // Authenticate as admin B for access test
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminB_email,
      password: adminB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 6. Attempt to access admin A's dashboard preference as admin B: should error
  await TestValidator.error(
    "organization admin B cannot access admin A's dashboard preference",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.at(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: pref.id,
        },
      );
    },
  );
}
