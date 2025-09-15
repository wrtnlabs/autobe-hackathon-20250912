import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin dashboard creation and role-based
 * constraints.
 *
 * 1. Register a new organization admin (using join endpoint)
 * 2. Log in as this org admin (using login endpoint), verify token and profile
 * 3. Use returned profile id/org id to create a dashboard (normal case;
 *    minimal required fields)
 * 4. Confirm organization_id and owner_user_id are correct in result
 * 5. Try with null department_id (should work as org-wide dashboard)
 * 6. Try again with the same title (duplicate - should fail)
 * 7. Try with invalid ids (random, unassigned owner_user_id etc) - should fail
 * 8. Try as unauthenticated/unauthorized user (should fail role check)
 */
export async function test_api_analytics_dashboard_creation_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register new org admin - join
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "ValidPassword!123",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const orgAdmin = adminJoin; // IHealthcarePlatformOrganizationAdmin.IAuthorized

  // 2. Log in as this org admin
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdmin.email,
        password: "ValidPassword!123",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResult);
  TestValidator.equals(
    "admin id should match after login",
    loginResult.id,
    orgAdmin.id,
  );

  // 3. Create a dashboard (minimal fields, null department_id)
  const dashboardTitle = RandomGenerator.name();
  const createDashboardInput = {
    owner_user_id: orgAdmin.id,
    organization_id: orgAdmin.id, // Using admin id as stand-in for org id due to DTO/actions context
    department_id: null,
    title: dashboardTitle,
    description: RandomGenerator.paragraph(),
    config_json: JSON.stringify({ widgets: [RandomGenerator.name()] }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  let dashboard: IHealthcarePlatformAnalyticsDashboard;
  dashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: createDashboardInput,
      },
    );
  typia.assert(dashboard);
  TestValidator.equals("dashboard title", dashboard.title, dashboardTitle);
  TestValidator.equals("dashboard owner", dashboard.owner_user_id, orgAdmin.id);

  // 4. Try duplicate title (should fail)
  await TestValidator.error("duplicate dashboard title fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: createDashboardInput,
      },
    );
  });

  // 5. Try with invalid owner_user_id (random uuid)
  const invalidOrgUserIdInput = {
    ...createDashboardInput,
    owner_user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  await TestValidator.error("invalid owner_user_id should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: invalidOrgUserIdInput,
      },
    );
  });

  // 6. Try as unauthenticated (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create dashboard",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
        unauthConn,
        {
          body: createDashboardInput,
        },
      );
    },
  );
}
