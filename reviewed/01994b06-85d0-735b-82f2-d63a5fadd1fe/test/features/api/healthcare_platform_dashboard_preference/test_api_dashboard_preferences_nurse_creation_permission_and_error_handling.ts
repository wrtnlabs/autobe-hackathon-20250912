import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Nurse dashboard preference creation and negative case coverage.
 *
 * 1. Register a new nurse with a valid business email, legal name, and license
 *    number.
 * 2. Login as the nurse for the session.
 * 3. Generate a random dashboard ID (simulating a dashboard accessible to this
 *    nurse).
 * 4. Construct a new dashboard preference record, linking nurse and dashboard.
 *
 *    - Preferences_json: Set with JSON string representing widgets/settings.
 * 5. Attempt to create dashboard preference via POST. Assert created data,
 *    including correct nurse and dashboard linkage and config persistence.
 * 6. Try to create a duplicate dashboard preference for the same
 *    nurse/dashboard. Assert business error (duplicate
 *    profile/prohibition).
 * 7. Attempt to create a dashboard preference for a random (invalid)
 *    dashboardId. Assert not-found or forbidden/permission error.
 */
export async function test_api_dashboard_preferences_nurse_creation_permission_and_error_handling(
  connection: api.IConnection,
) {
  // 1. Register a new nurse
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurseLicense = RandomGenerator.alphaNumeric(12);
  const nurseName = RandomGenerator.name();
  const nurse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, {
      body: {
        email: nurseEmail,
        full_name: nurseName,
        license_number: nurseLicense,
        password: "Secure#1234",
        specialty: "ICU",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformNurse.IJoin,
    });
  typia.assert(nurse);

  // 2. Nurse login
  const login = await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: "Secure#1234",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  typia.assert(login);

  // 3. Generate a random dashboard ID (simulate as accessible dashboard)
  const dashboardId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Create dashboard preference body
  const preferencesJson = JSON.stringify({
    widgets: ["vitals", "labs"],
    column_visibility: { heart_rate: true, bp: false },
    filters: { unit: "ICU" },
  });
  const prefCreate = {
    dashboard_id: dashboardId,
    user_id: nurse.id,
    preferences_json: preferencesJson,
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;

  // 5. Create the dashboard preference
  const createdPref =
    await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId,
        body: prefCreate,
      },
    );
  typia.assert(createdPref);
  TestValidator.equals(
    "dashboard preference linked nurse",
    createdPref.user_id,
    nurse.id,
  );
  TestValidator.equals(
    "dashboard preference linked dashboard",
    createdPref.dashboard_id,
    dashboardId,
  );
  TestValidator.equals(
    "preferences_json persisted",
    createdPref.preferences_json,
    preferencesJson,
  );

  // 6. Attempt to create duplicate dashboard preference
  await TestValidator.error(
    "duplicate dashboard preference for same nurse/dashboard should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId,
          body: prefCreate,
        },
      );
    },
  );

  // 7. Attempt to create dashboard preference for inaccessible dashboard
  const invalidDashboardId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const prefInvalid = {
    dashboard_id: invalidDashboardId,
    user_id: nurse.id,
    preferences_json: preferencesJson,
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  await TestValidator.error(
    "forbidden or not-found when nurse creates preference for dashboard they do not own",
    async () => {
      await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId: invalidDashboardId,
          body: prefInvalid,
        },
      );
    },
  );
}
