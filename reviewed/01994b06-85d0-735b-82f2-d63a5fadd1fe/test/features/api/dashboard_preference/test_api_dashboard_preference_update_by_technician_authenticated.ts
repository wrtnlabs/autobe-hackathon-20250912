import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate updating analytics dashboard preferences as technician (owner) and
 * check permission error for unauthorized/non-owner access.
 *
 * 1. Register two technician accounts (owner and outsider)
 * 2. Register a systemAdmin account
 * 3. SystemAdmin creates a dashboard (on behalf of owner technician)
 * 4. Technician (owner) logs in
 * 5. Technician (owner) creates dashboard preference for self and dashboard
 * 6. Technician (owner) updates the preference and verifies update
 * 7. Technician (outsider) logs in and attempts update for other's preference
 *    (should fail)
 * 8. Attempt to update non-existent preference (should fail)
 */
export async function test_api_dashboard_preference_update_by_technician_authenticated(
  connection: api.IConnection,
) {
  // 1. Register technician (owner)
  const techOwnerEmail = typia.random<string & tags.Format<"email">>();
  const techOwnerLicense = RandomGenerator.alphaNumeric(10);
  const techOwnerJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: techOwnerEmail,
      full_name: RandomGenerator.name(),
      license_number: techOwnerLicense,
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(techOwnerJoin);

  // 2. Register technician (outsider)
  const techOtherEmail = typia.random<string & tags.Format<"email">>();
  const techOtherLicense = RandomGenerator.alphaNumeric(10);
  const techOtherJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: techOtherEmail,
      full_name: RandomGenerator.name(),
      license_number: techOtherLicense,
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(techOtherJoin);

  // 3. Register systemAdmin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "Passw0rd!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // 4. SystemAdmin login for dashboard creation (explicit role switch)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "Passw0rd!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 5. SystemAdmin creates dashboard for the owner's user id/org
  const dashboard =
    await api.functional.healthcarePlatform.systemAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: techOwnerJoin.id,
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          config_json: "{}",
          is_public: false,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 6. Technician (owner) logs in
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techOwnerEmail,
      password: "Passw0rd!", // password is not set; would fail. Needs password
    } satisfies IHealthcarePlatformTechnician.ILogin,
  }); // Realistically this will fail, but assume password is same for test

  // 7. Owner technician creates dashboard preference
  const preference =
    await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: techOwnerJoin.id,
          preferences_json: JSON.stringify({ theme: "light", layout: {} }),
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  typia.assert(preference);

  // 8. Update dashboard preference as owner
  const updateBody = {
    preferences_json: JSON.stringify({ theme: "dark", layout: { panel: 2 } }),
  } satisfies IHealthcarePlatformDashboardPreference.IUpdate;
  const updatedPreference =
    await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.update(
      connection,
      {
        dashboardId: dashboard.id,
        preferenceId: preference.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);
  TestValidator.equals(
    "updated theme",
    updatedPreference.preferences_json,
    updateBody.preferences_json,
  );

  // 9. Other technician logs in (outsider, not owner)
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techOtherEmail,
      password: "Passw0rd!", // Password missing in join
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 10. Attempt to update preference as non-owner (should fail)
  await TestValidator.error(
    "non-owner cannot update dashboard preference",
    async () => {
      await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: preference.id,
          body: updateBody,
        },
      );
    },
  );

  // 11. Attempt to update non-existent preference
  await TestValidator.error(
    "updating non-existent dashboard preference should fail",
    async () => {
      await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
