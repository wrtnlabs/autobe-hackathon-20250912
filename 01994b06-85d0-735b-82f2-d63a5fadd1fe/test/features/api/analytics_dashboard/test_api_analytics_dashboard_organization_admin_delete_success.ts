import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test that an organization admin can successfully delete an existing
 * analytics dashboard by dashboardId.
 *
 * 1. Register a new organization admin.
 * 2. Login as organization admin.
 * 3. Create an analytics dashboard and capture its dashboardId.
 * 4. Delete the dashboard by dashboardId using the erase endpoint.
 * 5. Validate that the erase endpoint succeeds (no error is thrown and returns
 *    void). ● Note: Listing/reading endpoints for analytics dashboards, and
 *    audit log verification, are not present in the provided SDK/API
 *    functions, so only successful deletion (no error) can be checked
 *    here.
 */
export async function test_api_analytics_dashboard_organization_admin_delete_success(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as organization admin (verifies login and also resets token if API so operates)
  const loginBody = {
    email: adminEmail,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedIn);

  // 3. Create an analytics dashboard
  const dashboardCreateBody = {
    owner_user_id: loggedIn.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: null,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    config_json: "{}",
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      { body: dashboardCreateBody },
    );
  typia.assert(dashboard);

  // 4. Delete the dashboard
  await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.erase(
    connection,
    { dashboardId: dashboard.id },
  );

  // 5. No further API-based validation possible due to lack of listing/get or audit log SDK calls.
}
