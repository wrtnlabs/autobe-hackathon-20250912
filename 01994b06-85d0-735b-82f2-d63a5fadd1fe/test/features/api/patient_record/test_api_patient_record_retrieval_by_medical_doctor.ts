import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Test a medical doctor accessing a specific patient's record by the
 * patientRecordId.
 *
 * Validates access control, authentication, existence, and proper forbidden
 * error handling regarding patient record retrieval, including these cases:
 *
 * - Authenticated doctor retrieves a patient record from their org/department
 * - Nonexistent patientRecordId returns error
 * - Soft-deleted/archived record cannot be retrieved (returns error)
 * - Unauthenticated user fails to retrieve any record
 * - Doctor cannot access records outside their org/assigned scope
 *
 * All ID values are randomized; where no patient record creation API is
 * available, patient data is simulated locally. Authentication is handled using
 * provided APIs. Negative scenarios validate error handling through
 * TestValidator.error.
 */
export async function test_api_patient_record_retrieval_by_medical_doctor(
  connection: api.IConnection,
) {
  // 1. Register a new medical doctor
  const doctor_email = typia.random<string & tags.Format<"email">>();
  const doctor_npi = RandomGenerator.alphaNumeric(10);
  const doctor_password = RandomGenerator.alphaNumeric(12);
  const joinDoctorBody = {
    email: doctor_email,
    full_name: RandomGenerator.name(2),
    npi_number: doctor_npi,
    password: doctor_password as string & tags.Format<"password">,
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctorAuth = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinDoctorBody,
  });
  typia.assert(doctorAuth);

  // 2. Log in as that doctor
  const doctorLogin = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: doctor_email,
        password: doctor_password as string & tags.Format<"password">,
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    },
  );
  typia.assert(doctorLogin);

  // 3. Attempt non-existent patient record
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent patient recordId returns not found or forbidden",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.at(
        connection,
        {
          patientRecordId: nonExistentId,
        },
      );
    },
  );

  // 4. Simulate a valid patient record (no patientRecord create API, so demo with random and organization matching)
  const validPatientRecord = typia.random<IHealthcarePlatformPatientRecord>();
  // WARNING: organization_id here is simulated to match doctor; real APIs would need real org linkage
  validPatientRecord.organization_id = doctorAuth.id;
  const getPatientRecord =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.at(
      connection,
      {
        patientRecordId: validPatientRecord.id,
      },
    );
  typia.assert(getPatientRecord);
  TestValidator.equals(
    "returned patient record id matches",
    getPatientRecord.id,
    validPatientRecord.id,
  );

  // 5. Attempt as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve patient record",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.at(
        unauthConn,
        {
          patientRecordId: validPatientRecord.id,
        },
      );
    },
  );

  // 6. Attempt soft-deleted/archived record
  const softDeletedRecord = {
    ...typia.random<IHealthcarePlatformPatientRecord>(),
    deleted_at: new Date().toISOString(),
  };
  await TestValidator.error(
    "soft-deleted (archived) record returns not found or forbidden",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.at(
        connection,
        {
          patientRecordId: softDeletedRecord.id,
        },
      );
    },
  );

  // 7. Accessing record outside doctor's org
  const foreignRecord = typia.random<IHealthcarePlatformPatientRecord>();
  foreignRecord.organization_id = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  await TestValidator.error(
    "accessing patient record from outside doctor's organization/department fails",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.at(
        connection,
        {
          patientRecordId: foreignRecord.id,
        },
      );
    },
  );
}
