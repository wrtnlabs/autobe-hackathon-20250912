import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate the update of an analytics dashboard preference by a receptionist.
 * Covers successful update and permission boundaries.
 *
 * 1. Register an organization admin and create an analytics dashboard.
 * 2. Register receptionist1 and receptionist2.
 * 3. Receptionist1 logs in and creates dashboard preferences for the dashboard.
 * 4. Receptionist1 successfully updates the dashboard preference and the update is
 *    reflected.
 * 5. Receptionist2 attempts to update the same dashboard preference and is denied.
 * 6. Attempt to update with missing required fields, expect correct error or no
 *    mutation.
 * 7. (Optionally) OrganizationAdmin logs in, attempts preference update (should be
 *    allowed if business logic permits).
 */
export async function test_api_dashboard_preference_update_by_receptionist_success_and_permissions(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "pw1",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create an analytics dashboard as admin
  const dashboard: IHealthcarePlatformAnalyticsDashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: admin.id,
          organization_id: admin.id, // Using admin's id as stub org id for testing
          title: RandomGenerator.paragraph({ sentences: 3 }),
          config_json: JSON.stringify({ layout: "compact" }),
          is_public: true,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 3. Register two receptionists
  const receptionist1Email = typia.random<string & tags.Format<"email">>();
  const receptionist2Email = typia.random<string & tags.Format<"email">>();
  const receptionist1 = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionist1Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionist1);
  const receptionist2 = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionist2Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionist2);

  // 4. Receptionist1 logs in
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist1Email,
      password: "1234",
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 5. Create a dashboard preference as receptionist1
  const initialPrefs = JSON.stringify({ theme: "light", widgets: ["w1"] });
  const preference: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: receptionist1.id,
          preferences_json: initialPrefs,
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  typia.assert(preference);

  // 6. Receptionist1 updates preference
  const updatedPrefs = JSON.stringify({ theme: "dark", widgets: ["w2", "w3"] });
  const updatedPref: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: {
          preferences_json: updatedPrefs,
        } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
      },
    );
  typia.assert(updatedPref);
  TestValidator.equals(
    "preferences_json updated by owner",
    updatedPref.preferences_json,
    updatedPrefs,
  );

  // 7. Receptionist2 tries to update the same preference, expect error
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist2Email,
      password: "1234",
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  await TestValidator.error("Unauthorized receptionist update", async () => {
    await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: {
          preferences_json: JSON.stringify({ theme: "red" }),
        } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
      },
    );
  });

  // 8. Update with missing preferences_json, expect preferences unchanged
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist1Email,
      password: "1234",
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  const unchangedPref: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: {} satisfies IHealthcarePlatformDashboardPreference.IUpdate,
      },
    );
  typia.assert(unchangedPref);
  TestValidator.equals(
    "preferences_json unchanged after no-op update",
    unchangedPref.preferences_json,
    updatedPrefs,
  );

  // 9. Admin tries to update preference (optional business-allowed)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "pw1",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const adminUpdatePrefs = JSON.stringify({
    theme: "admin",
    widgets: ["admin"],
  });
  const adminUpdatedPref: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: {
          preferences_json: adminUpdatePrefs,
        } satisfies IHealthcarePlatformDashboardPreference.IUpdate,
      },
    );
  typia.assert(adminUpdatedPref);
  TestValidator.equals(
    "admin can update preference if permitted",
    adminUpdatedPref.preferences_json,
    adminUpdatePrefs,
  );
}
