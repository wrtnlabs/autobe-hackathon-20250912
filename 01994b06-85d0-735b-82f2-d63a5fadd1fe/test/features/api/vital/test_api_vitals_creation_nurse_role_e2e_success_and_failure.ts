import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

/**
 * E2E test: Nurse creates a new vital sign record for a patient encounter and
 * triggers business rule validations
 *
 * This test simulates the realistic workflow where a nurse needs to create a
 * vitals entry in a patient's EHR encounter, including
 *
 * - Happy path (success creation with valid data/assignment)
 * - Failure due to duplicate posting
 * - Failure for invalid vital measurement (clinically impossible values)
 * - Permission error (nurse not assigned to the encounter)
 * - Error for using deleted/nonexistent encounter/patient record
 *
 * Steps:
 *
 * 1. Receptionist registers and logs in
 * 2. Receptionist creates Patient and PatientRecord
 * 3. Nurse registers and logs in
 * 4. Nurse creates an encounter for patient record
 * 5. Nurse submits a valid vital record for encounter; verifies all fields
 * 6. Attempt same submission again for duplicate error
 * 7. Try out-of-range/invalid values: negative temperature, impossible HR
 * 8. Swap to different nurse (not assigned) and try again (should fail)
 * 9. Try posting with random (invalid) encounter Id (should fail)
 */
export async function test_api_vitals_creation_nurse_role_e2e_success_and_failure(
  connection: api.IConnection,
) {
  // Receptionist join/login
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionistJoinBody = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionistJoinBody,
  });
  typia.assert(receptionist);

  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Create Patient
  const patientCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: RandomGenerator.date(
      new Date(1970, 0, 1),
      50 * 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.receptionist.patients.create(
      connection,
      {
        body: patientCreateBody,
      },
    );
  typia.assert(patient);

  // Create PatientRecord
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const patientRecordCreateBody = {
    organization_id: orgId,
    department_id: null,
    patient_user_id: patient.id,
    external_patient_number: null,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    gender: null,
    status: "active",
    demographics_json: null,
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.receptionist.patientRecords.create(
      connection,
      {
        body: patientRecordCreateBody,
      },
    );
  typia.assert(patientRecord);

  // Nurse join/login
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(12);
  const nurseJoinBody = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(8),
    specialty: "ICU",
    phone: RandomGenerator.mobile(),
    password: nursePassword,
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: nurseJoinBody,
  });
  typia.assert(nurse);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // Nurse creates encounter for patient record
  const encounterCreateBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: nurse.id as string & tags.Format<"uuid">,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    encounter_end_at: null,
    status: "active",
    notes: "Routine exam",
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterCreateBody,
      },
    );
  typia.assert(encounter);

  // Submit valid vital (heart rate)
  const measuredAt = new Date().toISOString();
  const vitalCreateBody = {
    ehr_encounter_id: encounter.id,
    vital_type: "heart_rate",
    vital_value: 72,
    unit: "bpm",
    measured_at: measuredAt,
  } satisfies IHealthcarePlatformVital.ICreate;
  const vital =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: vitalCreateBody,
      },
    );
  typia.assert(vital);

  TestValidator.equals(
    "vital value matches",
    vital.vital_value,
    vitalCreateBody.vital_value,
  );
  TestValidator.equals("vital unit matches", vital.unit, vitalCreateBody.unit);
  TestValidator.equals(
    "vital encounter ID matches",
    vital.ehr_encounter_id,
    vitalCreateBody.ehr_encounter_id,
  );
  TestValidator.equals(
    "vital type matches",
    vital.vital_type,
    vitalCreateBody.vital_type,
  );
  TestValidator.equals(
    "measured_at matches",
    vital.measured_at,
    vitalCreateBody.measured_at,
  );
  TestValidator.equals(
    "recorded_by_user_id matches nurse id",
    vital.recorded_by_user_id,
    nurse.id,
  );

  // Attempt to create duplicate vital (expected to fail)
  await TestValidator.error("duplicate vital entry should error", async () => {
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: vitalCreateBody,
      },
    );
  });

  // Post invalid vital values (negative temperature)
  await TestValidator.error(
    "negative body temperature should error",
    async () => {
      const invalidVitalBody = {
        ehr_encounter_id: encounter.id,
        vital_type: "temp_c",
        vital_value: -100,
        unit: "C",
        measured_at: new Date().toISOString(),
      } satisfies IHealthcarePlatformVital.ICreate;
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: invalidVitalBody,
        },
      );
    },
  );

  // Post clinically impossible heart rate
  await TestValidator.error("impossible heart rate should error", async () => {
    const highHrVitalBody = {
      ehr_encounter_id: encounter.id,
      vital_type: "heart_rate",
      vital_value: 500,
      unit: "bpm",
      measured_at: new Date().toISOString(),
    } satisfies IHealthcarePlatformVital.ICreate;
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: highHrVitalBody,
      },
    );
  });

  // Create a different nurse, try to create vital (should error)
  const otherNurseEmail = typia.random<string & tags.Format<"email">>();
  const otherNursePassword = RandomGenerator.alphaNumeric(12);
  const otherNurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: otherNurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      specialty: "ICU",
      phone: RandomGenerator.mobile(),
      password: otherNursePassword,
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(otherNurse);

  await api.functional.auth.nurse.login(connection, {
    body: {
      email: otherNurseEmail,
      password: otherNursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  await TestValidator.error(
    "nurse not assigned to encounter should not be able to post vitals",
    async () => {
      const attemptBody = {
        ehr_encounter_id: encounter.id,
        vital_type: "heart_rate",
        vital_value: 70,
        unit: "bpm",
        measured_at: new Date().toISOString(),
      } satisfies IHealthcarePlatformVital.ICreate;
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: attemptBody,
        },
      );
    },
  );

  // Try posting vital to invalid encounterId
  await TestValidator.error(
    "posting vital to invalid encounter id should fail",
    async () => {
      const fakeEncounterId = typia.random<string & tags.Format<"uuid">>();
      const attemptBody = {
        ehr_encounter_id: fakeEncounterId,
        vital_type: "temp_c",
        vital_value: 36.5,
        unit: "C",
        measured_at: new Date().toISOString(),
      } satisfies IHealthcarePlatformVital.ICreate;
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: fakeEncounterId,
          body: attemptBody,
        },
      );
    },
  );
}
