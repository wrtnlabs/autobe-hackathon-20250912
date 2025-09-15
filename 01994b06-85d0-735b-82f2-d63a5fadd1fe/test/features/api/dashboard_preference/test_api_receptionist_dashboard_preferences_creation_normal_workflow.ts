import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test for receptionist creation of analytics dashboard preferences.
 *
 * 1. Register a system admin account to provision analytics dashboards.
 * 2. Login as admin and provision a new analytics dashboard; use random org/dept.
 * 3. Register a receptionist, which returns an authentication (token context).
 *    Receptionist is now authenticated for the following preference logic.
 * 4. Receptionist creates preferences for the dashboard via API with custom
 *    config.
 * 5. Validate returned preference is correctly linked: (a) dashboard_id matches,
 *    (b) user_id matches receptionist, (c) config is persisted.
 * 6. Attempt duplicate preference creation (should error), validate error thrown.
 * 7. Attempt to create preference for non-existent dashboard (random UUID),
 *    validate error thrown.
 *
 * Covers positive and negative business logic for preference creation and
 * linkage.
 */
export async function test_api_receptionist_dashboard_preferences_creation_normal_workflow(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as admin, create dashboard (admin context)
  const adminLoginBody = {
    email: adminJoinBody.email,
    provider: "local",
    provider_key: adminJoinBody.provider_key,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminAuth);

  const dashboardCreateBody = {
    owner_user_id: adminAuth.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: null,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_json: JSON.stringify({
      widgets: [RandomGenerator.name()],
      theme: "light",
    }),
    is_public: false,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      { body: dashboardCreateBody },
    );
  typia.assert(dashboard);

  // 3. Register a receptionist, which returns an authenticated context
  const receptionistCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionistCreateBody,
  });
  typia.assert(receptionist);

  // 4. Receptionist creates dashboard preferences (using current token context)
  const prefConfig = { layout: "grid", theme: "dark", showWelcome: false };
  const preferenceBody = {
    dashboard_id: dashboard.id,
    user_id: receptionist.id,
    preferences_json: JSON.stringify(prefConfig),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const preference =
    await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: preferenceBody,
      },
    );
  typia.assert(preference);
  TestValidator.equals(
    "preference links to dashboard",
    preference.dashboard_id,
    dashboard.id,
  );
  TestValidator.equals(
    "preference user_id matches receptionist",
    preference.user_id,
    receptionist.id,
  );
  TestValidator.equals(
    "preferences_json matches config",
    preference.preferences_json,
    JSON.stringify(prefConfig),
  );

  // 5. Attempt to create duplicate preference; must error
  await TestValidator.error(
    "duplicate preference creation must fail",
    async () => {
      await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId: dashboard.id,
          body: preferenceBody,
        },
      );
    },
  );

  // 6. Attempt to create preference for non-existent dashboard; must error
  await TestValidator.error(
    "preference for non-existent dashboard must fail",
    async () => {
      await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            ...preferenceBody,
            dashboard_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
