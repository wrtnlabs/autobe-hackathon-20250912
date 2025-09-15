import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate detail retrieval (by ID) of an analytics dashboard for an
 * organization admin.
 *
 * This test consists of these steps:
 *
 * 1. Register and login organization admin 1 (org1)
 * 2. Register and login organization admin 2 (org2)
 * 3. Org admin 1 creates a dashboard (owned by org1)
 * 4. Org admin 1 retrieves dashboard detail by dashboardId (success path)
 * 5. Org admin 2 tries to retrieve dashboard detail by org1's dashboardId
 *    (should fail)
 * 6. Query detail with a non-existent dashboardId (should fail)
 * 7. Validate that all expected config/ownership fields exist in the response
 * 8. Unauthenticated attempt to retrieve dashboard returns error
 */
export async function test_api_analytics_dashboard_detail_view_by_id_org_admin(
  connection: api.IConnection,
) {
  // Register org admin 1
  const org1_email = typia.random<string & tags.Format<"email">>();
  const org1_password = RandomGenerator.alphaNumeric(12);
  const org1_full_name = RandomGenerator.name();
  const org1_joined = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: org1_email,
        password: org1_password,
        full_name: org1_full_name,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(org1_joined);

  // Register org admin 2
  const org2_email = typia.random<string & tags.Format<"email">>();
  const org2_password = RandomGenerator.alphaNumeric(12);
  const org2_full_name = RandomGenerator.name();
  const org2_joined = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: org2_email,
        password: org2_password,
        full_name: org2_full_name,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(org2_joined);

  // Login as org admin 1
  const org1_login = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: org1_email,
        password: org1_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(org1_login);

  // Org admin 1 creates dashboard
  const dashboard_title = RandomGenerator.paragraph({ sentences: 3 });
  const dashboard_config = JSON.stringify({ layout: "grid", widgets: [] });
  const dashboard1 =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: org1_joined.id,
          organization_id: org1_joined.id,
          title: dashboard_title,
          config_json: dashboard_config,
          is_public: true,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard1);

  // Retrieve dashboard detail by ID (org admin 1, success)
  const detail =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.at(
      connection,
      {
        dashboardId: dashboard1.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "dashboard title matches",
    detail.title,
    dashboard_title,
  );
  TestValidator.equals(
    "dashboard config_json matches",
    detail.config_json,
    dashboard_config,
  );
  TestValidator.equals("dashboard id matches", detail.id, dashboard1.id);
  TestValidator.equals(
    "dashboard owner matches",
    detail.owner_user_id,
    org1_joined.id,
  );
  TestValidator.equals(
    "dashboard organization matches",
    detail.organization_id,
    org1_joined.id,
  );
  TestValidator.predicate(
    "dashboard created_at is present",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "dashboard updated_at is present",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );

  // Login as org admin 2
  const org2_login = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: org2_email,
        password: org2_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(org2_login);

  // Org admin 2 attempts to access org1's dashboard (should fail)
  await TestValidator.error(
    "org admin from another org cannot access other's dashboard",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.at(
        connection,
        {
          dashboardId: dashboard1.id,
        },
      );
    },
  );

  // Query with random/nonexistent dashboardId (should fail)
  const fake_dashboard_id = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "querying with nonexistent dashboardId fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.at(
        connection,
        {
          dashboardId: fake_dashboard_id,
        },
      );
    },
  );

  // Unauthenticated attempt (empty headers, simulates unauthenticated user)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated dashboard detail fetch is denied",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.at(
        unauthConn,
        {
          dashboardId: dashboard1.id,
        },
      );
    },
  );
}
