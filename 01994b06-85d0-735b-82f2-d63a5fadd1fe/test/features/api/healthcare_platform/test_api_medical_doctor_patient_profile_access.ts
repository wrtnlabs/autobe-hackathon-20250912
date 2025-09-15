import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * E2E test verifying medical doctor user can access a specific patient's
 * detailed profile, and that proper error handling is enforced for
 * unauthorized or invalid profile access.
 *
 * 1. Register a new medical doctor (with unique email/NPI/password)
 * 2. Login as that medical doctor (to ensure fresh context with session
 *    authentication)
 * 3. Register a new patient and obtain patientId
 * 4. As the medical doctor, retrieve the patient's profile with the valid
 *    patientId
 *
 *    - Assert that the returned data matches expected patient info
 * 5. Attempt to retrieve a patient profile for a random (non-existent)
 *    patientId
 *
 *    - Expect error (TestValidator.error) for non-existent patientId
 * 6. Attempt to access the same patient profile with an unauthenticated
 *    connection (simulate no login)
 *
 *    - Expect error (TestValidator.error) for access without authentication
 */
export async function test_api_medical_doctor_patient_profile_access(
  connection: api.IConnection,
) {
  // 1. Register a new medical doctor
  const doctorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    specialty: RandomGenerator.paragraph({ sentences: 2 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: doctorJoinBody,
  });
  typia.assert(doctor);

  // 2. Login as that medical doctor to get proper tokens
  const doctorLogin = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: doctorJoinBody.email,
        password: doctorJoinBody.password,
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    },
  );
  typia.assert(doctorLogin);

  // 3. Register a new patient and get patientId
  const patientJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    date_of_birth: new Date(
      1990 + Math.floor(Math.random() * 20),
      0,
      1,
    ).toISOString(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(14),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patient);

  // 4. As medical doctor, retrieve the patient's profile
  const profile =
    await api.functional.healthcarePlatform.medicalDoctor.patients.at(
      connection,
      {
        patientId: patient.id,
      },
    );
  typia.assert(profile);
  TestValidator.equals(
    "retrieved patient profile id matches",
    profile.id,
    patient.id,
  );
  TestValidator.equals(
    "retrieved patient email matches",
    profile.email,
    patient.email,
  );
  TestValidator.equals(
    "retrieved patient full_name matches",
    profile.full_name,
    patient.full_name,
  );
  TestValidator.equals(
    "retrieved patient date_of_birth matches",
    profile.date_of_birth,
    patient.date_of_birth,
  );

  // 5. Attempt to retrieve non-existent patient (random UUID)
  await TestValidator.error(
    "access non-existent patientId should be error",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patients.at(
        connection,
        {
          patientId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Attempt unauthorized access without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access patient profile",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patients.at(
        unauthConn,
        {
          patientId: patient.id,
        },
      );
    },
  );
}
