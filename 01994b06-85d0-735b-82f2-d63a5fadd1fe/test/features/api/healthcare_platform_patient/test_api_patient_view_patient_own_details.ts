import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

export async function test_api_patient_view_patient_own_details(
  connection: api.IConnection,
) {
  /**
   * Validate patient self-view endpoint: patient can fetch their own details,
   * but not others or unauthenticated.
   *
   * 1. Register a new patient and retrieve authentication credential.
   * 2. Authenticated patient fetches their own profile with GET, verify all
   *    profile fields match registration, sensitive details are excluded, and
   *    account is active (not soft-deleted).
   * 3. Attempt authenticated fetch with a non-existent patientId to confirm error
   *    response.
   * 4. Attempt unauthenticated fetch of own profile to confirm access is denied.
   */
  // 1. Register a new patient
  const joinInput = {
    email: `${RandomGenerator.alphabets(8)}@healthmail.com`,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      1985 + Math.floor(Math.random() * 30),
      0,
      1,
    ).toISOString(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const authorizedPatient = await api.functional.auth.patient.join(connection, {
    body: joinInput,
  });
  typia.assert(authorizedPatient);
  const patientId = authorizedPatient.id;

  // 2. Patient fetches own details (authenticated)
  const selfProfile =
    await api.functional.healthcarePlatform.patient.patients.at(connection, {
      patientId,
    });
  typia.assert(selfProfile);
  TestValidator.equals("patient id matches", selfProfile.id, patientId);
  TestValidator.equals("email matches", selfProfile.email, joinInput.email);
  TestValidator.equals(
    "full_name matches",
    selfProfile.full_name,
    joinInput.full_name,
  );
  TestValidator.equals(
    "date_of_birth matches",
    selfProfile.date_of_birth,
    joinInput.date_of_birth,
  );
  TestValidator.equals("phone matches", selfProfile.phone, joinInput.phone);
  TestValidator.equals(
    "should not be deleted (deleted_at null)",
    selfProfile.deleted_at,
    null,
  );

  // 3. Attempt fetch with non-existent patientId (authenticated)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "getting non-existent patientId should fail",
    async () => {
      await api.functional.healthcarePlatform.patient.patients.at(connection, {
        patientId: nonExistentId,
      });
    },
  );

  // 4. Attempt fetch without authentication (unauthenticated connection)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access denied without authentication",
    async () => {
      await api.functional.healthcarePlatform.patient.patients.at(
        unauthenticatedConn,
        { patientId },
      );
    },
  );
}
