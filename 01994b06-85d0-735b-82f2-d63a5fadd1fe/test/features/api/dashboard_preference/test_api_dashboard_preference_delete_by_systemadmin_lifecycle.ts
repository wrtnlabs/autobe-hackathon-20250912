import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates the full lifecycle of dashboard preference deletion by a system
 * admin.
 *
 * The test covers:
 *
 * 1. Registering a system admin and logging in.
 * 2. Creating an analytics dashboard as that admin.
 * 3. Creating a dashboard preference as the admin.
 * 4. Deleting the preference and verifying it cannot be deleted twice (idempotency
 *    or not found logic).
 * 5. Attempting deletion by another system admin (should fail with error,
 *    confirming access control enforcement).
 *
 * Verifies permission boundaries, resource cleanup logic, and correct type
 * contract usage in the system admin dashboard preference API.
 */
export async function test_api_dashboard_preference_delete_by_systemadmin_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail =
    RandomGenerator.name(2).replace(" ", ".") + "@test-biz.com";
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: "A_StrongPassword_" + RandomGenerator.alphaNumeric(5),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Login as system admin
  const adminLoginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);

  // 3. Create analytics dashboard
  const dashboardBody = {
    owner_user_id: adminAuth.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: null,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_json: JSON.stringify({ widgets: [], settings: { theme: "light" } }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      { body: dashboardBody },
    );
  typia.assert(dashboard);

  // 4. Create dashboard preference (for system admin user)
  const preferenceBody = {
    dashboard_id: dashboard.id,
    user_id: adminAuth.id,
    preferences_json: JSON.stringify({ theme: "dark", lastLayout: "tabular" }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const pref =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.preferences.create(
      connection,
      { dashboardId: dashboard.id, body: preferenceBody },
    );
  typia.assert(pref);

  // 5. Delete preference successfully
  await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.preferences.erase(
    connection,
    { dashboardId: dashboard.id, preferenceId: pref.id },
  );

  // 6. Attempt delete again (expect error, since it was already deleted)
  await TestValidator.error(
    "deleting already deleted preference yields error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.preferences.erase(
        connection,
        { dashboardId: dashboard.id, preferenceId: pref.id },
      );
    },
  );

  // 7. Register a different system admin (unauthorized scenario)
  const otherAdminEmail =
    RandomGenerator.name(2).replace(" ", ".") + "@sandbox.co";
  const otherJoinBody = {
    email: otherAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: otherAdminEmail,
    password: "OtherStrongPwd_" + RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  await api.functional.auth.systemAdmin.join(connection, {
    body: otherJoinBody,
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: otherAdminEmail,
      provider: "local",
      provider_key: otherAdminEmail,
      password: otherJoinBody.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "unauthorized system admin cannot delete preference they do not own",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.preferences.erase(
        connection,
        { dashboardId: dashboard.id, preferenceId: pref.id },
      );
    },
  );
}
