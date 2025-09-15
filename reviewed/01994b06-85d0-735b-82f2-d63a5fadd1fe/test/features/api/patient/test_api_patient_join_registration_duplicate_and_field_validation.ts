import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate the full patient registration flow including duplicate and required
 * field error cases.
 *
 * 1. Register a new patient (with unique email, password, full_name,
 *    date_of_birth)
 * 2. Validate response includes expected tokens and patient profile info
 * 3. Attempt to register again with the same email (should error)
 * 4. Attempt to register omitting required field (password) (should error)
 */
export async function test_api_patient_join_registration_duplicate_and_field_validation(
  connection: api.IConnection,
) {
  // 1. Register a new patient (password path)
  const email = `${RandomGenerator.alphabets(8)}@example.com`;
  const patientInput = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      Date.now() - 25 * 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    // Optionally add phone
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.IJoin;

  const patient = await api.functional.auth.patient.join(connection, {
    body: patientInput,
  });
  typia.assert(patient);
  TestValidator.equals(
    "created patient email matches input",
    patient.email,
    patientInput.email,
  );
  TestValidator.equals(
    "created patient name matches input",
    patient.full_name,
    patientInput.full_name,
  );
  TestValidator.equals(
    "created patient date_of_birth matches input",
    patient.date_of_birth,
    patientInput.date_of_birth,
  );
  // token structure is validated by typia.assert
  TestValidator.predicate(
    "refresh_token present if in schema",
    patient.refresh_token !== undefined &&
      typeof patient.refresh_token === "string" &&
      patient.refresh_token.length > 0,
  );
  // 2. Attempt duplicate registration (should error)
  await TestValidator.error(
    "duplicate registration with same email should throw error",
    async () => {
      await api.functional.auth.patient.join(connection, {
        body: { ...patientInput },
      });
    },
  );
  // 3. Attempt required field omission (no password)
  const omittedPasswordInput = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      Date.now() - 30 * 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    // No password
  } satisfies IHealthcarePlatformPatient.IJoin;
  await TestValidator.error(
    "registration without password should throw error",
    async () => {
      await api.functional.auth.patient.join(connection, {
        body: omittedPasswordInput,
      });
    },
  );
}
