import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * E2E test for receptionist retrieving a patient profile in the healthcare
 * platform.
 *
 * 1. Register a receptionist
 * 2. Log in as the receptionist
 * 3. Register a patient
 * 4. Receptionist retrieves the patient by id and validates returned details
 * 5. Receptionist attempts to retrieve a non-existent patient (expects error)
 */
export async function test_api_receptionist_retrieve_patient(
  connection: api.IConnection,
) {
  // 1. Register a receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistFullName = RandomGenerator.name();
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: receptionistFullName,
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);

  // 2. Log in as the receptionist
  const loginOutput: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.login(connection, {
      body: {
        email: receptionistEmail,
        password: "password",
      } satisfies IHealthcarePlatformReceptionist.ILogin,
    });
  typia.assert(loginOutput);
  TestValidator.equals(
    "receptionist id after join and login",
    receptionist.id,
    loginOutput.id,
  );

  // 3. Register a patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientName = RandomGenerator.name();
  const patientDateOfBirth = new Date().toISOString();
  const patient: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: {
        email: patientEmail,
        full_name: patientName,
        date_of_birth: patientDateOfBirth,
        password: "password",
      } satisfies IHealthcarePlatformPatient.IJoin,
    });
  typia.assert(patient);

  // 4. Receptionist retrieves the patient by id
  const fetched =
    await api.functional.healthcarePlatform.receptionist.patients.at(
      connection,
      {
        patientId: patient.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("fetched patient id matches", fetched.id, patient.id);
  TestValidator.equals(
    "fetched patient email matches",
    fetched.email,
    patient.email,
  );
  TestValidator.equals(
    "fetched patient full_name matches",
    fetched.full_name,
    patient.full_name,
  );
  TestValidator.equals(
    "fetched patient date_of_birth matches",
    fetched.date_of_birth,
    patient.date_of_birth,
  );

  // 5. Receptionist attempts to retrieve a non-existent patient (expects error)
  await TestValidator.error(
    "receptionist cannot retrieve non-existent patient",
    async () => {
      await api.functional.healthcarePlatform.receptionist.patients.at(
        connection,
        {
          patientId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
