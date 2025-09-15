import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * End-to-end test for analytics dashboard preference creation and access
 * control, by technician user.
 *
 * 1. Technician registration (join) with unique email/license, validate
 *    response and token.
 * 2. Technician login for authentication and context.
 * 3. (Setup) Generate two dashboard UUIDs: one for valid scope, one for
 *    forbidden scope.
 * 4. Create dashboard preference for allowed dashboard as this technician
 *    (simulate that the dashboard is allowed for this user).
 * 5. Validate successful association: created preference has correct
 *    dashboard_id and user_id; validate presence of audit fields
 *    (created_at, updated_at), and all schema properties with
 *    typia.assert.
 * 6. Negative: Attempt to create preferences for dashboard outside authorized
 *    scope (simulate unauthorized by using a random UUID not matching this
 *    user), expect error.
 * 7. Negative: Attempt to create preference with malformed or missing fields
 *    (e.g., preferences_json = empty string or not provided), expect
 *    validation error.
 */
export async function test_api_dashboard_preferences_technician_creation_and_scope_control(
  connection: api.IConnection,
) {
  // 1. Register a technician (join)
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const license = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: technicianEmail,
    full_name: RandomGenerator.name(),
    license_number: license,
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.IJoin;
  const joinResp = await api.functional.auth.technician.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResp);

  // 2. Technician login
  const loginResp = await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: joinBody.license_number, // Using license_number as password stand-in
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  typia.assert(loginResp);
  const technicianId = loginResp.id;

  // 3. Simulate two dashboards: one authorized, one forbidden
  const allowedDashboardId = typia.random<string & tags.Format<"uuid">>();
  const forbiddenDashboardId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create dashboard preference for allowed dashboard
  const preferenceBody = {
    dashboard_id: allowedDashboardId,
    user_id: technicianId,
    preferences_json: JSON.stringify({
      theme: "dark",
      layout: "grid",
      widgets: ["chart", "table"],
    }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const pref =
    await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: allowedDashboardId,
        body: preferenceBody,
      },
    );
  typia.assert(pref);
  TestValidator.equals(
    "dashboard id matches",
    pref.dashboard_id,
    allowedDashboardId,
  );
  TestValidator.equals("user id matches", pref.user_id, technicianId);
  TestValidator.predicate(
    "audit fields present",
    typeof pref.created_at === "string" && typeof pref.updated_at === "string",
  );

  // 5. Negative: Attempt to create preference for forbidden dashboard
  await TestValidator.error("unauthorized dashboard should fail", async () => {
    await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: forbiddenDashboardId,
        body: {
          dashboard_id: forbiddenDashboardId,
          user_id: technicianId,
          preferences_json: JSON.stringify({ theme: "light" }),
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  });

  // 6. Negative: Attempt creation with malformed preferences_json (empty string)
  await TestValidator.error(
    "missing/malformed preferences_json yields error",
    async () => {
      await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId: allowedDashboardId,
          body: {
            dashboard_id: allowedDashboardId,
            user_id: technicianId,
            preferences_json: "",
          } satisfies IHealthcarePlatformDashboardPreference.ICreate,
        },
      );
    },
  );
}
