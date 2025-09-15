import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test updating dashboard preferences for an analytics dashboard as an
 * authenticated medical doctor.
 *
 * Steps:
 *
 * 1. Register system admin and authenticate
 * 2. System admin creates a dashboard for an organization and a user
 * 3. Register a medical doctor user
 * 4. Medical doctor creates an initial dashboard preference for their dashboard
 * 5. Medical doctor updates the dashboard preference
 * 6. Unauthorized preference update attempt by another doctor or with invalid id
 *    fails
 * 7. Validate all business logic and data
 */
export async function test_api_dashboard_preference_update_by_medical_doctor_authenticated(
  connection: api.IConnection,
) {
  // 1. Register and authenticate system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // 2. Register medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(10);
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNpi,
      password: doctorPassword,
      specialty: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorJoin);

  // 3. System admin creates a dashboard for org/doctor
  // Use admin's org (mock: sysAdminJoin.id) and assign owner as doctor
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: doctorJoin.id,
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null,
          title: RandomGenerator.paragraph({ sentences: 4 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          config_json: JSON.stringify({
            widgetLayout: ["main"],
            colorMode: "light",
          }),
          is_public: RandomGenerator.pick([true, false]),
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 4. Medical doctor logs in
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 5. Doctor creates initial dashboard preference
  const preference =
    await api.functional.healthcarePlatform.medicalDoctor.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: doctorJoin.id,
          preferences_json: JSON.stringify({
            theme: "dark",
            layout: "compact",
          }),
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  typia.assert(preference);

  // 6. Update the dashboard preference as doctor
  const updatedPreferences = {
    preferences_json: JSON.stringify({ theme: "light", layout: "expanded" }),
    last_viewed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformDashboardPreference.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.medicalDoctor.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: updatedPreferences,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "dashboard_id matches after update",
    updated.dashboard_id,
    dashboard.id,
  );
  TestValidator.equals(
    "user_id matches after update",
    updated.user_id,
    doctorJoin.id,
  );
  TestValidator.equals(
    "updated theme in preferences_json",
    JSON.parse(updated.preferences_json).theme,
    "light",
  );
  TestValidator.equals(
    "updated layout in preferences_json",
    JSON.parse(updated.preferences_json).layout,
    "expanded",
  );

  // 7. Unauthorized update by another doctor (should fail)
  const otherDocEmail = typia.random<string & tags.Format<"email">>();
  const otherDocPassword = RandomGenerator.alphaNumeric(10);
  const otherNpi = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: otherDocEmail,
      full_name: RandomGenerator.name(),
      npi_number: otherNpi,
      password: otherDocPassword,
      specialty: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: otherDocEmail,
      password: otherDocPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "unauthorized doctor cannot update another doctor's dashboard preference",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: preference.id,
          body: {
            preferences_json: JSON.stringify({ theme: "hack" }),
          },
        },
      );
    },
  );

  // 8. Invalid preference id update should fail
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const invalidPreferenceId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent dashboard preference should fail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: invalidPreferenceId,
          body: {
            preferences_json: JSON.stringify({ theme: "fail" }),
          },
        },
      );
    },
  );
}
