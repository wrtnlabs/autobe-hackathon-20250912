import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system administrator can create and fetch analytics dashboard
 * details, and that error scenarios are handled for unauthenticated and
 * non-existent lookups.
 *
 * Steps:
 *
 * 1. Register system admin (POST /auth/systemAdmin/join), log in (POST
 *    /auth/systemAdmin/login).
 * 2. Create dashboard (POST /healthcarePlatform/systemAdmin/analyticsDashboards)
 *    using admin's org/user info.
 * 3. Retrieve dashboard by ID (GET
 *    /healthcarePlatform/systemAdmin/analyticsDashboards/{dashboardId}) and
 *    check all fields: owner_user_id, org info, department, visibility,
 *    config_json etc.
 * 4. Attempt dashboard fetch with missing/invalid token: expect failure.
 * 5. Attempt dashboard fetch with valid token but random UUID: expect not found
 *    error.
 */
export async function test_api_analytics_dashboard_detail_view_by_id_system_admin(
  connection: api.IConnection,
) {
  // 1. Create a valid admin user (join)
  const joinEmail = `${RandomGenerator.alphabets(8)}@enterprise-corp.com`;
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: joinEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: joinEmail,
        password: joinPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. Log in as admin
  const adminLogin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: joinEmail,
        provider: "local",
        provider_key: joinEmail,
        password: joinPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create an analytics dashboard
  const dashboardReq = {
    owner_user_id: adminLogin.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    config_json: JSON.stringify({ layout: "basic", version: 1 }),
    is_public: true,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard: IHealthcarePlatformAnalyticsDashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: dashboardReq,
      },
    );
  typia.assert(dashboard);

  // Main positive scenario: fetch dashboard by ID
  const retrieved =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.at(
      connection,
      {
        dashboardId: dashboard.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("dashboard id matches", retrieved.id, dashboard.id);
  TestValidator.equals(
    "dashboard owner matches",
    retrieved.owner_user_id,
    adminLogin.id,
  );
  TestValidator.equals("title matches", retrieved.title, dashboardReq.title);
  TestValidator.equals(
    "organization_id matches",
    retrieved.organization_id,
    dashboardReq.organization_id,
  );
  TestValidator.equals(
    "is_public",
    retrieved.is_public,
    dashboardReq.is_public,
  );
  TestValidator.equals(
    "config_json matches",
    retrieved.config_json,
    dashboardReq.config_json,
  );
  TestValidator.equals(
    "description matches",
    retrieved.description,
    dashboardReq.description,
  );

  // 4. Try fetch with missing authentication (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("should fail without authentication", async () => {
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.at(
      unauthConn,
      {
        dashboardId: dashboard.id,
      },
    );
  });

  // 5. Try fetch with random (non-existent) dashboardId
  await TestValidator.error(
    "should fail with non-existent dashboardId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.at(
        connection,
        {
          dashboardId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
