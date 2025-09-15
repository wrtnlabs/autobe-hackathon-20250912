import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for patient dashboard preference personalization workflow.
 *
 * 1. Register patient (join), authenticate patient (login).
 * 2. Register system admin, authenticate admin, create analytics dashboard (assign
 *    org and owner to patient for test purposes).
 * 3. Switch back: patient logs in again.
 * 4. Patient creates dashboard preference (preferences.create).
 * 5. Assert preference fields are correct: patient, dashboard, preferences_json.
 * 6. Negative tests: duplicate (same dashboard/user) creation and invalid
 *    dashboardId.
 */
export async function test_api_patient_dashboard_preferences_creation_e2e_personalization(
  connection: api.IConnection,
) {
  // Register a new patient and authenticate.
  const patient_email = RandomGenerator.alphaNumeric(10) + "@testpatient.com";
  const patient_password = RandomGenerator.alphaNumeric(12);
  const patient_join = await api.functional.auth.patient.join(connection, {
    body: {
      email: patient_email,
      full_name: RandomGenerator.name(),
      password: patient_password,
      date_of_birth: new Date(1990, 2, 3).toISOString(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient_join);

  // Patient must be logged in for later.
  const patient_login = await api.functional.auth.patient.login(connection, {
    body: {
      email: patient_email,
      password: patient_password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  typia.assert(patient_login);

  // Register and authenticate system admin.
  const admin_email = RandomGenerator.alphaNumeric(12) + "@admin.com";
  const admin_password = RandomGenerator.alphaNumeric(18);
  const admin_join = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: admin_email as string & tags.Format<"email">,
      password: admin_password,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: admin_email as string,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin_join);
  const admin_login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admin_email as string & tags.Format<"email">,
      password: admin_password,
      provider: "local",
      provider_key: admin_email as string,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(admin_login);

  // System admin creates an analytics dashboard for patient (test purpose: assign owner is patient).
  const dashboard_create =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: patient_join.id,
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          config_json: JSON.stringify({ widgets: ["trend", "pie"] }),
          is_public: false,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard_create);

  // Switch back: patient re-authenticates
  const _patient_relogin = await api.functional.auth.patient.login(connection, {
    body: {
      email: patient_email,
      password: patient_password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // Patient creates dashboard preference
  const preferences_json = JSON.stringify({ theme: "dark", layout: "cards" });
  const pref_create =
    await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard_create.id,
        body: {
          dashboard_id: dashboard_create.id,
          user_id: patient_join.id,
          preferences_json,
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  typia.assert(pref_create);
  TestValidator.equals(
    "dashboard_id matches",
    pref_create.dashboard_id,
    dashboard_create.id,
  );
  TestValidator.equals("user_id matches", pref_create.user_id, patient_join.id);
  TestValidator.equals(
    "preferences_json matches",
    pref_create.preferences_json,
    preferences_json,
  );

  // Edge: Duplicate creation should fail or deduplicate.
  await TestValidator.error(
    "duplicate patient/dashboard preference is forbidden",
    async () => {
      await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId: dashboard_create.id,
          body: {
            dashboard_id: dashboard_create.id,
            user_id: patient_join.id,
            preferences_json: JSON.stringify({ theme: "light" }),
          } satisfies IHealthcarePlatformDashboardPreference.ICreate,
        },
      );
    },
  );

  // Edge: Creating preference for a nonexistent dashboard should fail.
  await TestValidator.error(
    "nonexistent dashboard preference creation fails",
    async () => {
      await api.functional.healthcarePlatform.patient.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            dashboard_id: typia.random<string & tags.Format<"uuid">>(),
            user_id: patient_join.id,
            preferences_json: JSON.stringify({ theme: "doesnotmatter" }),
          } satisfies IHealthcarePlatformDashboardPreference.ICreate,
        },
      );
    },
  );
}
