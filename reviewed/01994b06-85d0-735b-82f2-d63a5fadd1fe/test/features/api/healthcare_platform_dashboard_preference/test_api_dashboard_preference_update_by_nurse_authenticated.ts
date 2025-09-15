import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate updating analytics dashboard preferences as authenticated nurse.
 *
 * 1. Register systemAdmin (needed to create dashboard)
 * 2. Login as systemAdmin (for dashboard create)
 * 3. Register nurse (to own the dashboard preference)
 * 4. Login as nurse (for creating and updating preferences)
 * 5. SystemAdmin creates analytics dashboard
 * 6. Nurse creates dashboard preference for the dashboard
 * 7. Nurse updates their preference (as themselves)
 * 8. Confirm update is persisted with new data
 * 9. Negative case: Try to update preference with wrong nurse (should fail)
 * 10. Negative case: Try to update preference with wrong dashboardId or
 *     preferenceId (should fail)
 */
export async function test_api_dashboard_preference_update_by_nurse_authenticated(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@org-system.com`;
  const systemAdminJoin = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: "AdminPass123!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminJoin,
  });
  typia.assert(admin);

  // 2. Login as systemAdmin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "AdminPass123!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. Register nurse
  const nurseEmail = `${RandomGenerator.alphabets(8)}@nurse-hospital.com`;
  const nurseLicense = RandomGenerator.alphaNumeric(10);
  const nurseJoin = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: nurseLicense,
    specialty: "ICU",
    phone: RandomGenerator.mobile(),
    password: "NursePass456!",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: nurseJoin,
  });
  typia.assert(nurse);

  // 4. Login as nurse
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: "NursePass456!",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 5. System admin creates a dashboard (switch to admin context)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "AdminPass123!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const dashboardData = {
    owner_user_id: nurse.id,
    organization_id: orgId,
    department_id: null,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_json: JSON.stringify({
      widgets: [RandomGenerator.name(), RandomGenerator.name()],
    }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      { body: dashboardData },
    );
  typia.assert(dashboard);

  // 6. Nurse logs in again to create their preference
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: "NursePass456!",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  const preferenceCreate = {
    dashboard_id: dashboard.id,
    user_id: nurse.id,
    preferences_json: JSON.stringify({
      layout: "A",
      theme: "light",
      views: [1, 2, 3],
    }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const preference =
    await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.create(
      connection,
      { dashboardId: dashboard.id, body: preferenceCreate },
    );
  typia.assert(preference);

  // 7. Update the dashboard preference as authenticated nurse
  const updatedJson = JSON.stringify({
    layout: "B",
    theme: "dark",
    views: [3, 2, 1],
    flag: true,
  });
  const updateBody = {
    preferences_json: updatedJson,
  } satisfies IHealthcarePlatformDashboardPreference.IUpdate;
  const updatedPref =
    await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPref);
  TestValidator.equals(
    "nurse updated dashboard preferences should be persisted",
    updatedPref.preferences_json,
    updatedJson,
  );

  // 8. Negative scenario: Another nurse cannot update the same preference
  // Register second nurse
  const nurse2Email = `${RandomGenerator.alphabets(8)}@nurse-hospital.com`;
  const nurse2 = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurse2Email,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: "ER",
      phone: RandomGenerator.mobile(),
      password: "NursePass321!",
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurse2);
  // Login as nurse2
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse2Email,
      password: "NursePass321!",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  // Try to update first nurse's dashboard preference
  await TestValidator.error(
    "unauthorized nurse cannot update another nurse's dashboard preference",
    async () => {
      await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: preference.id,
          body: {
            preferences_json: JSON.stringify({ fail: true }),
          } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
        },
      );
    },
  );

  // 9. Negative: Update non-existent preference
  await TestValidator.error(
    "updating non-existent preference should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            preferences_json: JSON.stringify({ fail: true }),
          } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
        },
      );
    },
  );
  // 10. Negative: Update with non-existent dashboardId
  await TestValidator.error(
    "updating with non-existent dashboardId should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: typia.random<string & tags.Format<"uuid">>(),
          preferenceId: preference.id,
          body: {
            preferences_json: JSON.stringify({ fail: true }),
          } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
        },
      );
    },
  );
}
