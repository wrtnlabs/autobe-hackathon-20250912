import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test updating dashboard preferences as an authenticated department head user.
 *
 * 1. Register department head and login (obtain authentication context)
 * 2. Register systemAdmin and login (for dashboard creation)
 * 3. SystemAdmin creates an analytics dashboard
 * 4. Switch to department head
 * 5. Department head creates a dashboard preference for the created dashboard
 * 6. Department head updates their dashboard preference
 * 7. Verifies the update is successful
 * 8. Attempts negative: another department head attempts to update preference
 *    (should fail)
 * 9. Attempts negative: update with non-existent preferenceId or dashboardId
 *    (should fail)
 */
export async function test_api_dashboard_preference_update_by_department_head_authenticated(
  connection: api.IConnection,
) {
  // 1. Register department head
  const dhEmail = typia.random<string & tags.Format<"email">>();
  const dhPassword = RandomGenerator.alphaNumeric(12);
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: dhEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: dhPassword,
        sso_provider: null,
        sso_provider_key: null,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(departmentHead);

  // 2. Register systemAdmin (for dashboard creation)
  const saEmail = typia.random<string & tags.Format<"email">>();
  const saPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: saEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(systemAdmin);

  // 3. Login as systemAdmin to create dashboard
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: saEmail,
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 4. Create dashboard as systemAdmin
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: systemAdmin.id,
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          config_json: JSON.stringify({
            layout: RandomGenerator.paragraph({ sentences: 2 }),
          }),
          is_public: true,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 5. Switch to department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: dhEmail,
      password: dhPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 6. Department head creates dashboard preference
  const initialPreference =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: departmentHead.id,
          preferences_json: JSON.stringify({ theme: "light", widgets: [] }),
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  typia.assert(initialPreference);

  // 7. Department head updates their preference
  const updateInput = {
    preferences_json: JSON.stringify({
      theme: "dark",
      widgets: [{ id: 1, collapsed: true }],
    }),
    last_viewed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformDashboardPreference.IUpdate;
  const updatedPreference =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: initialPreference.id,
        body: updateInput,
      },
    );
  typia.assert(updatedPreference);
  TestValidator.equals(
    "preferences_json updated",
    updatedPreference.preferences_json,
    updateInput.preferences_json,
  );
  TestValidator.equals(
    "last_viewed_at updated",
    updatedPreference.last_viewed_at,
    updateInput.last_viewed_at,
  );

  // 8. Negative test: Another department head tries to update the preference
  const anotherDhEmail = typia.random<string & tags.Format<"email">>();
  const anotherDhPassword = RandomGenerator.alphaNumeric(12);
  const anotherDepartmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: anotherDhEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: anotherDhPassword,
        sso_provider: null,
        sso_provider_key: null,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(anotherDepartmentHead);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: anotherDhEmail,
      password: anotherDhPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  // Try to update preference belonging to first department head
  await TestValidator.error(
    "unauthorized departmentHead cannot update another's preference",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: initialPreference.id,
          body: {
            preferences_json: JSON.stringify({ theme: "hacker" }),
          } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
        },
      );
    },
  );

  // 9. Negative test: Update with non-existent preferenceId (should fail)
  await TestValidator.error(
    "update fails for nonexistent preferenceId",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: typia.random<string & tags.Format<"uuid">>(), // random unused id
          body: {
            preferences_json: JSON.stringify({ theme: "doesnotexist" }),
          } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
        },
      );
    },
  );
  // 10. Negative test: Update with non-existent dashboardId (should fail)
  await TestValidator.error(
    "update fails for nonexistent dashboardId",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: typia.random<string & tags.Format<"uuid">>(), // random unused id
          preferenceId: initialPreference.id,
          body: {
            preferences_json: JSON.stringify({ theme: "doesnotexist" }),
          } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
        },
      );
    },
  );
}
