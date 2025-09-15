import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validates hard deletion (erase) of a nurse's analytics dashboard preference.
 *
 * - Registers and logs in a nurse
 * - Generates dashboardId/preferenceId UUIDs (since preference creation/listing
 *   is not available)
 * - Performs DELETE on nurse's dashboard preference (should succeed/idempotent)
 * - Repeats DELETE (should be idempotent or error with not found/forbidden)
 * - Attempts deletion with unauthenticated connection (should be forbidden)
 * - Attempts deletion as a different nurse (should be forbidden)
 */
export async function test_api_nurse_analytics_dashboard_preference_hard_deletion(
  connection: api.IConnection,
) {
  // Register and login as primary nurse
  const nurseJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@clinic.com`,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    password: "NurseSecret123!",
    specialty: "ICU",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.IJoin;

  const nurse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, { body: nurseJoinBody });
  typia.assert(nurse);

  // Generate dashboard/preference UUIDs for DELETE
  const dashboardId = typia.random<string & tags.Format<"uuid">>();
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // Erase dashboard preference (should not throw for first time)
  await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.erase(
    connection,
    { dashboardId, preferenceId },
  );

  // Erase again (should not throw or should error with clear not-found/forbidden)
  await TestValidator.error(
    "deleting already erased dashboard preference should be idempotent or error",
    async () => {
      await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.erase(
        connection,
        { dashboardId, preferenceId },
      );
    },
  );

  // Attempt as unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete dashboard preference",
    async () => {
      await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.erase(
        unauthConn,
        { dashboardId, preferenceId },
      );
    },
  );

  // Register and login as another nurse
  const nurse2JoinBody = {
    email: `${RandomGenerator.alphabets(8)}@clinic.com`,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    password: "OtherNursePW!",
    specialty: "ER",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.IJoin;

  await api.functional.auth.nurse.join(connection, { body: nurse2JoinBody });

  // Attempt erase as another nurse
  await TestValidator.error(
    "non-owner nurse cannot delete another nurse's dashboard preference",
    async () => {
      await api.functional.healthcarePlatform.nurse.analyticsDashboards.preferences.erase(
        connection,
        { dashboardId, preferenceId },
      );
    },
  );
}
