import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Tests retrieval of dashboard preference details for a department head.
 * Verifies authentication, creation, and retrieval of a preference works, as
 * well as access control.
 *
 * Steps:
 *
 * 1. Register department head A and login
 * 2. Create a dashboardId (simulated)
 * 3. Create dashboard preference as department head A
 * 4. Retrieve that dashboard preference (should return correct data)
 * 5. Register department head B (different user) and login
 * 6. Attempt to retrieve department head A's preference, should receive error
 */
export async function test_api_dashboard_preference_retrieve_success_department_head(
  connection: api.IConnection,
) {
  // Register department head A
  const emailA: string = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(10);
  const joinA = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: emailA,
      full_name: RandomGenerator.name(),
      password: passwordA,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(joinA);

  // Simulate dashboardId (since no dashboard creation endpoint is exposed)
  const dashboardId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const userIdA: string & tags.Format<"uuid"> = joinA.id;

  // Create preference as department head A
  const prefCreate = {
    dashboard_id: dashboardId,
    user_id: userIdA,
    preferences_json: JSON.stringify({
      theme: "dark",
      widgets: ["chart", "table"],
    }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const createdPref =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.create(
      connection,
      { dashboardId, body: prefCreate },
    );
  typia.assert(createdPref);

  // Retrieve the preference as department head A
  const fetchedPref =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.at(
      connection,
      {
        dashboardId: dashboardId,
        preferenceId: createdPref.id,
      },
    );
  typia.assert(fetchedPref);
  TestValidator.equals(
    "retrieved dashboard preference matches creation",
    fetchedPref,
    createdPref,
    (key) => ["id", "created_at", "updated_at"].includes(key),
  );

  // Register department head B (other user)
  const emailB: string = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: emailB,
      full_name: RandomGenerator.name(),
      password: passwordB,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  // Login as department head B
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: emailB,
      password: passwordB,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Attempt to fetch department head A's preference as B (should fail)
  await TestValidator.error(
    "other department head cannot access this dashboard preference",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.at(
        connection,
        {
          dashboardId: dashboardId,
          preferenceId: createdPref.id,
        },
      );
    },
  );
}
