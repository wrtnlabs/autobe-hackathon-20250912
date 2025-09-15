import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDashboardPreference";

/**
 * Validate department head dashboard preference listing, creation, and access
 * rights, including cross-role and multi-actor visibility.
 *
 * 1. Register and login as department head A (with passwordA)
 * 2. Register and login as department head C (with passwordC)
 * 3. Register and login as organization admin B (with passwordB)
 * 4. Organization admin B creates an analytics dashboard (department-owned)
 * 5. Department head A logs in and creates a preference record for the dashboard
 * 6. Department head A can fetch their preference by dashboardId/userId
 * 7. Department head C and organization admin B cannot see this preference when
 *    filtering for user_id (should return empty)
 * 8. Negative access/visibility cases for RBAC confirmation
 */
export async function test_api_analytics_dashboard_preference_patch_department_head(
  connection: api.IConnection,
) {
  // 1. Register department head (A)
  const passwordA = RandomGenerator.alphaNumeric(12);
  const deptHeadAEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadAJoin: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: deptHeadAEmail,
        full_name: RandomGenerator.name(),
        password: passwordA,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(deptHeadAJoin);

  // 2. Register department head (C)
  const passwordC = RandomGenerator.alphaNumeric(12);
  const deptHeadCEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadCJoin: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: deptHeadCEmail,
        full_name: RandomGenerator.name(),
        password: passwordC,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(deptHeadCJoin);

  // 3. Register organization admin (B)
  const passwordB = RandomGenerator.alphaNumeric(12);
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: passwordB,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdminJoin);

  // 4. Organization admin B login and create dashboard for department (owned by A)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: passwordB,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const dashboard: IHealthcarePlatformAnalyticsDashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: deptHeadAJoin.id,
          organization_id: orgAdminJoin.id,
          department_id: departmentId,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          config_json: JSON.stringify({ widgets: [1, 2, 3], theme: "light" }),
          is_public: true,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 5. Department head A login, create preference for self/dashboard
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadAEmail,
      password: passwordA,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const preference: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: deptHeadAJoin.id,
          preferences_json: JSON.stringify({ theme: "blue", view: "compact" }),
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  typia.assert(preference);

  // 6. Department head A can fetch their preference (search, should return 1 record)
  const searchA: IPageIHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.index(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: deptHeadAJoin.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformDashboardPreference.IRequest,
      },
    );
  typia.assert(searchA);
  TestValidator.predicate(
    "owner (A) search should return 1 preference record",
    searchA.data.length === 1 && searchA.data[0].id === preference.id,
  );

  // 7. Department head C login and try to search for A's preference, expect no results
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadCEmail,
      password: passwordC,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const searchC: IPageIHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.index(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: deptHeadAJoin.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformDashboardPreference.IRequest,
      },
    );
  typia.assert(searchC);
  TestValidator.equals(
    "other department head (C) cannot view preferences for department head (A)",
    searchC.data.length,
    0,
  );

  // 8. Organization admin login, try to search for A's preference, expect no results
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: passwordB,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const searchB: IPageIHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.index(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: deptHeadAJoin.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformDashboardPreference.IRequest,
      },
    );
  typia.assert(searchB);
  TestValidator.equals(
    "organization admin (B) should not view department head A's preference records",
    searchB.data.length,
    0,
  );
}
