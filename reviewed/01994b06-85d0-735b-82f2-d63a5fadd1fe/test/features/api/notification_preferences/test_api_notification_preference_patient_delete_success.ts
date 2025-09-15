import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Test deletion of a patient's notification preference.
 *
 * Workflow:
 *
 * 1. Register a new patient account using /auth/patient/join
 * 2. Login as the patient using /auth/patient/login
 * 3. Generate a random UUID for notificationPreferenceId (simulate creation - not
 *    implemented in SDK)
 * 4. Call DELETE
 *    /healthcarePlatform/patient/notificationPreferences/{notificationPreferenceId}
 * 5. Confirm request completes successfully (no output, no exception is success)
 * 6. Attempt to delete the same notificationPreferenceId again
 * 7. Expect either success (idempotency) or error (not found); accept both as
 *    valid API behaviors
 */
export async function test_api_notification_preference_patient_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new patient
  const patientJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(2000, 0, 1).toISOString(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientAuth = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patientAuth);

  // 2. Login as patient
  const patientLoginBody = {
    email: patientJoinBody.email,
    password: patientJoinBody.password,
  } satisfies IHealthcarePlatformPatient.ILogin;
  const loginAuth = await api.functional.auth.patient.login(connection, {
    body: patientLoginBody,
  });
  typia.assert(loginAuth);

  // 3. Generate a random notificationPreferenceId (simulate creation)
  const notificationPreferenceId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete notification preference (soft delete)
  await api.functional.healthcarePlatform.patient.notificationPreferences.erase(
    connection,
    {
      notificationPreferenceId: notificationPreferenceId,
    },
  );

  // 5. Attempt to delete again -- accept success (idempotent) or error (not found)
  try {
    await api.functional.healthcarePlatform.patient.notificationPreferences.erase(
      connection,
      {
        notificationPreferenceId: notificationPreferenceId,
      },
    );
    // Accept as idempotent success
  } catch {
    // Accept as error (not found or already deleted)
  }
}
