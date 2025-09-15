import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for system admin analytics dashboard creation
 *
 * 1. Register a new system admin (join API)
 * 2. Login as system admin (login API)
 * 3. Create an analytics dashboard with minimum required fields
 * 4. Assert dashboard creation and response type
 * 5. Attempt creation with missing required field (e.g., blank title)
 * 6. Attempt duplicate dashboard (same title/owner/organization) and expect
 *    rejection
 * 7. (Access control) Attempt create with unauthenticated context and expect
 *    access denied
 */
export async function test_api_analytics_dashboard_creation_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();

  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      provider: "local",
      provider_key: adminEmail,
      password: "TestPassword123!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinResult);
  const admin = joinResult;

  // 2. Login as system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "TestPassword123!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Create dashboard
  const dashboardBody = {
    owner_user_id: admin.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: null,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    config_json: JSON.stringify({
      widgets: [{ id: 1, type: "chart", options: {} }],
    }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      { body: dashboardBody },
    );
  typia.assert(dashboard);
  TestValidator.equals(
    "dashboard title matches",
    dashboard.title,
    dashboardBody.title,
  );
  TestValidator.equals(
    "dashboard org matches",
    dashboard.organization_id,
    dashboardBody.organization_id,
  );
  TestValidator.equals(
    "dashboard owner matches",
    dashboard.owner_user_id,
    admin.id,
  );
  TestValidator.equals(
    "dashboard department null",
    dashboard.department_id,
    null,
  );

  // 4. Failure: missing required field (e.g., title)
  await TestValidator.error("missing title is rejected", async () => {
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          ...dashboardBody,
          title: "",
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  });

  // 5. Failure: duplicate dashboard creation for owner/org/title
  await TestValidator.error(
    "duplicate dashboard title for same org/owner is rejected",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
        connection,
        { body: dashboardBody },
      );
    },
  );

  // 6. Access control: attempt create with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated create is denied", async () => {
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      unauthConn,
      { body: dashboardBody },
    );
  });
}
