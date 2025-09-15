import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";

/**
 * E2E test: Deleting a medical doctor's analytics dashboard preference
 *
 * This test verifies:
 *
 * - Only the owner doctor can delete their own dashboard preference
 * - Repeated deletions are handled gracefully (idempotency or not found)
 * - Unauthenticated or other doctors cannot delete another doctor's
 *   preference
 *
 * Steps:
 *
 * 1. Register and login a medical doctor (owner)
 * 2. Generate dashboardId and preferenceId (simulate real IDs)
 * 3. As owner/doctor, delete the dashboard preference (should succeed)
 * 4. Re-attempt deletion (should yield not found or idempotent success)
 * 5. Attempt deletion as unauthenticated (no Authorization header), should
 *    error
 * 6. Register/login as another doctor, attempt delete as non-owner, should
 *    error
 */
export async function test_api_medical_doctor_analytics_dashboard_preference_deletion(
  connection: api.IConnection,
) {
  // 1. Register and login original doctor (owner)
  const doctorJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const owner: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: doctorJoin,
    });
  typia.assert(owner);

  // 2. Generate dashboardId and preferenceId
  const dashboardId = typia.random<string & tags.Format<"uuid">>();
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // 3. As owner, delete the dashboard preference
  await api.functional.healthcarePlatform.medicalDoctor.analyticsDashboards.preferences.erase(
    connection,
    { dashboardId, preferenceId },
  );
  // No output expected - void

  // 4. Re-attempt deletion (should be idempotent or not-found error)
  await TestValidator.error(
    "second delete attempt should fail/not found",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.analyticsDashboards.preferences.erase(
        connection,
        { dashboardId, preferenceId },
      );
    },
  );

  // 5. Delete as unauthenticated user (no Authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete preference",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.analyticsDashboards.preferences.erase(
        unauthConn,
        { dashboardId, preferenceId },
      );
    },
  );

  // 6. Register/login as another doctor and attempt delete
  const nonOwnerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const nonOwner: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: nonOwnerJoin,
    });
  typia.assert(nonOwner);
  await TestValidator.error(
    "non-owner doctor cannot delete another's preference",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.analyticsDashboards.preferences.erase(
        connection,
        { dashboardId, preferenceId },
      );
    },
  );
}
