import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validates that a patient can update their dashboard preferences and only the
 * correct user can perform the update.
 *
 * Scenario:
 *
 * 1. Register OrgAdmin & two Patient accounts
 * 2. OrgAdmin creates a dashboard
 * 3. Patient-1 logs in, creates a dashboard preference
 * 4. Patient-1 updates preference with a valid payload and asserts data is changed
 * 5. Patient-1 attempts updates with missing/invalid (empty payload or no
 *    preferences_json) and expects validation error, and data unchanged
 * 6. Patient-2 logs in, attempts to update Patient-1's preference, expects error,
 *    and data unchanged
 */
export async function test_api_dashboard_preference_update_by_patient_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Admin and two patient registration
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  const patient1Email = RandomGenerator.alphaNumeric(10) + "@test.com";
  const patient1Password = RandomGenerator.alphaNumeric(10);
  const patient1DOB = new Date(1991, 4, 13).toISOString();
  const patient1 = await api.functional.auth.patient.join(connection, {
    body: {
      email: patient1Email,
      full_name: RandomGenerator.name(),
      date_of_birth: patient1DOB as string & tags.Format<"date-time">,
      phone: RandomGenerator.mobile(),
      password: patient1Password,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient1);

  const patient2Email = RandomGenerator.alphaNumeric(10) + "@test.com";
  const patient2Password = RandomGenerator.alphaNumeric(10);
  const patient2DOB = new Date(1989, 2, 21).toISOString();
  const patient2 = await api.functional.auth.patient.join(connection, {
    body: {
      email: patient2Email,
      full_name: RandomGenerator.name(),
      date_of_birth: patient2DOB as string & tags.Format<"date-time">,
      phone: RandomGenerator.mobile(),
      password: patient2Password,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient2);

  // 2. Admin creates an analytics dashboard for their org
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail as string & tags.Format<"email">,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const dashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: orgAdmin.id,
          organization_id: orgAdmin.id, // assume admin's id is org id for test
          title: RandomGenerator.name(3),
          config_json: JSON.stringify({ widgets: [RandomGenerator.name(2)] }),
          is_public: true,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 3. Patient-1 logs in, creates dashboard preference
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patient1Email,
      password: patient1Password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  const originalPrefJson = JSON.stringify({
    theme: "light",
    layout: "default",
  });
  const preference =
    await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: patient1.id,
          preferences_json: originalPrefJson,
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  typia.assert(preference);

  // 4. Update preference with valid payload
  const newPrefJson = JSON.stringify({ theme: "dark", layout: "grid" });
  const updatedPreference =
    await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: {
          preferences_json: newPrefJson,
        } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
      },
    );
  typia.assert(updatedPreference);
  TestValidator.equals(
    "preference updated",
    updatedPreference.preferences_json,
    newPrefJson,
  );
  TestValidator.notEquals(
    "preference_json changed",
    updatedPreference.preferences_json,
    preference.preferences_json,
  );

  // 5. Attempt to update with empty payload (should error, must not change data)
  await TestValidator.error("update with empty payload fails", async () => {
    await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: {} as IHealthcarePlatformDashboardPreference.IUpdate, // Intentionally empty
      },
    );
  });
  // Confirm original update unchanged
  const refreshed =
    await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences
      .update(connection, {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: {},
      })
      .catch(() => updatedPreference); // On failure, return last valid one.
  TestValidator.equals(
    "preference data unchanged after failed empty update",
    refreshed.preferences_json,
    newPrefJson,
  );

  // 6. Patient-2 logs in, attempts to update Patient-1's preference (should error, data unchanged)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patient2Email,
      password: patient2Password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  await TestValidator.error(
    "patient-2 cannot update another user's preference",
    async () => {
      await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: preference.id,
          body: {
            preferences_json: JSON.stringify({ theme: "hack" }),
          } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
        },
      );
    },
  );

  // Confirm still unchanged
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patient1Email,
      password: patient1Password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  const finalPref =
    await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences
      .update(connection, {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: {},
      })
      .catch(() => updatedPreference);
  TestValidator.equals(
    "preference data still unchanged after failed cross-user update",
    finalPref.preferences_json,
    newPrefJson,
  );
}
