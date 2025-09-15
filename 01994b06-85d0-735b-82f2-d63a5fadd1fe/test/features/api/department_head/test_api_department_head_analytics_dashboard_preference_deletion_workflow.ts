import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Validates deletion of a department head’s dashboard preference.
 *
 * Scenario: Register and authenticate as a department head (UserA), simulate
 * dashboard/preference IDs (since no API to create/fetch), perform a DELETE on
 * that preference, check idempotency (repeat), validate forbidden for another
 * user (UserB), and not found for non-existent preference.
 *
 * Steps:
 *
 * 1. Register & login as UserA (department head)
 * 2. Generate random dashboardId/preferenceId as test target
 * 3. Delete preference with proper authorization – expect success (void,
 *    idempotent)
 * 4. Repeat delete – still allowed (idempotency)
 * 5. Register & login as UserB – try to delete UserA’s preference – expect
 *    forbidden error
 * 6. As UserA, try to delete a truly random (non-existent) preferenceId – expect
 *    not found or error
 */
export async function test_api_department_head_analytics_dashboard_preference_deletion_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register & login UserA
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAFullName = RandomGenerator.name();
  const userAPassword = RandomGenerator.alphaNumeric(12);

  const userA = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: userAEmail,
      full_name: userAFullName,
      password: userAPassword,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(userA);

  // Step 2: Simulate dashboardId and preferenceId
  const dashboardId = typia.random<string & tags.Format<"uuid">>();
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Delete preference as UserA (expect success)
  await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.erase(
    connection,
    {
      dashboardId,
      preferenceId,
    },
  );
  // By contract, returns void. Idempotency: repeat
  await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.erase(
    connection,
    {
      dashboardId,
      preferenceId,
    },
  );

  // Step 4: Register & login UserB
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBFullName = RandomGenerator.name();
  const userBPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: userBEmail,
      full_name: userBFullName,
      password: userBPassword,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  // Login as UserB (updates connection token to this user)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  // Try to delete UserA's preference (should fail, forbidden)
  await TestValidator.error(
    "forbidden error when deleting other user’s preference",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.erase(
        connection,
        {
          dashboardId,
          preferenceId,
        },
      );
    },
  );

  // Step 5: Login again as UserA
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Step 6: Attempt deletion of unknown preferenceId (simulate not found)
  const unknownPreferenceId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "not found error for unknown preferenceId",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.erase(
        connection,
        {
          dashboardId,
          preferenceId: unknownPreferenceId,
        },
      );
    },
  );
}
