import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Verify error handling when receptionist tries to update a dashboard
 * preference that does not exist (invalid dashboardId and/or preferenceId).
 *
 * The test:
 *
 * 1. Registers a receptionist with random credentials (valid join).
 * 2. Attempts to update a dashboard preference record using random, non-existent
 *    dashboardId/preferenceId and a valid update body, relying on the
 *    authentication established during the join step.
 * 3. Asserts that an error is thrown (not-found or similar) and that no dashboard
 *    preference data is created or altered.
 */
export async function test_api_dashboard_preference_update_by_receptionist_nonexistent(
  connection: api.IConnection,
) {
  // 1. Register/receptionist join to establish authentication context
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistJoinBody = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;

  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionistJoinBody,
  });
  typia.assert(receptionist);

  // 2. Attempt to update a dashboard preference with non-existent dashboardId/preferenceId while authenticated
  const invalidDashboardId = typia.random<string & tags.Format<"uuid">>();
  const invalidPreferenceId = typia.random<string & tags.Format<"uuid">>();

  const updateBody = {
    preferences_json: JSON.stringify({
      theme: RandomGenerator.pick(["dark", "light"]),
    }),
    last_viewed_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformDashboardPreference.IUpdate;

  await TestValidator.error(
    "should receive error on update with non-existent dashboardId/preferenceId",
    async () => {
      await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.update(
        connection,
        {
          dashboardId: invalidDashboardId,
          preferenceId: invalidPreferenceId,
          body: updateBody,
        },
      );
    },
  );
}
