import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

/**
 * E2E test for vitals creation by a medical doctor, covering success and error
 * paths.
 *
 * This test covers:
 *
 * - Multi-role authentication setup for both medical doctor and receptionist
 * - Creation of patient, patient record, and clinical encounter dependencies
 * - Successful vitals entry creation by authorized doctor (valid data)
 * - Data validation errors (impossible value, missing fields, invalid unit)
 * - Error for vital creation by a medical doctor not assigned to the encounter
 * - Error for using non-existent patient/encounter references
 *
 * Steps:
 *
 * 1. Receptionist joins and authenticates
 * 2. Receptionist registers a patient
 * 3. Receptionist creates a patient record for that patient
 * 4. Medical doctor registers and authenticates
 * 5. Doctor creates an encounter for the patient record
 * 6. Doctor submits a valid vital entry for the encounter and validates success
 * 7. Doctor attempts to submit invalid vitals (bad unit, impossible value, missing
 *    fields) and expects errors
 * 8. Second medical doctor joins and authenticates, and tries to submit a vital
 *    for the encounter (should be forbidden)
 * 9. Doctor attempts to submit vital referencing non-existent encounter and
 *    patient record (should be not found/error)
 */
export async function test_api_vitals_creation_medical_doctor_e2e_success_and_error_paths(
  connection: api.IConnection,
) {
  // 1. Receptionist signs up and logs in
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 2. Receptionist creates patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient =
    await api.functional.healthcarePlatform.receptionist.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1992-03-14T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // 3. Receptionist creates patient record
  const patientRecord =
    await api.functional.healthcarePlatform.receptionist.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string>(),
          department_id: null,
          patient_user_id: patient.id,
          external_patient_number: null,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: "other",
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 4. Medical doctor joins and logs in
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorPassword,
      specialty: RandomGenerator.paragraph({ sentences: 1 }),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 5. Medical doctor creates an encounter for the patient record
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          provider_user_id: doctor.id,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          encounter_end_at: null,
          status: "active",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 6. Submit valid vital entry (success case)
  const vitalBody = {
    ehr_encounter_id: encounter.id,
    vital_type: "temp_c",
    vital_value: 36.8,
    unit: "C",
    measured_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformVital.ICreate;
  const vital =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: vitalBody,
      },
    );
  typia.assert(vital);
  TestValidator.equals(
    "linked encounter",
    vital.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals("linked doctor", vital.recorded_by_user_id, doctor.id);
  TestValidator.equals("vital type", vital.vital_type, vitalBody.vital_type);
  TestValidator.equals("vital value", vital.vital_value, vitalBody.vital_value);
  TestValidator.equals("vital unit", vital.unit, vitalBody.unit);

  // 7. Validation errors for invalid vitals data
  await TestValidator.error(
    "impossible value for temperature should fail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          body: {
            ehr_encounter_id: encounter.id,
            vital_type: "temp_c",
            vital_value: 60, // implausible
            unit: "C",
            measured_at: new Date().toISOString(),
          } satisfies IHealthcarePlatformVital.ICreate,
        },
      );
    },
  );
  await TestValidator.error("invalid vital unit fails", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: {
          ehr_encounter_id: encounter.id,
          vital_type: "temp_c",
          vital_value: 37.0,
          unit: "mmHg", // wrong for temperature
          measured_at: new Date().toISOString(),
        } satisfies IHealthcarePlatformVital.ICreate,
      },
    );
  });
  await TestValidator.error("missing vital_type field fails", async () => {
    // Omit vital_type using spread/omit pattern
    const { vital_type, ...withoutVitalType } = vitalBody;
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: withoutVitalType as IHealthcarePlatformVital.ICreate,
      },
    );
  });

  // 8. Second medical doctor tries to record vital for that encounter, should be forbidden
  const doctor2Email = typia.random<string & tags.Format<"email">>();
  const doctor2Password = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctor2Email,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctor2Password,
      specialty: RandomGenerator.paragraph({ sentences: 1 }),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor2Email,
      password: doctor2Password,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "unassigned doctor posting vital is forbidden",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          body: {
            ehr_encounter_id: encounter.id,
            vital_type: "heart_rate",
            vital_value: 90,
            unit: "bpm",
            measured_at: new Date().toISOString(),
          } satisfies IHealthcarePlatformVital.ICreate,
        },
      );
    },
  );

  // 9. Use non-existent encounterId
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const fakeEncounterId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent encounter id error", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: fakeEncounterId,
        body: {
          ehr_encounter_id: fakeEncounterId,
          vital_type: "bp_systolic",
          vital_value: 120,
          unit: "mmHg",
          measured_at: new Date().toISOString(),
        } satisfies IHealthcarePlatformVital.ICreate,
      },
    );
  });

  const fakePatientId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent patient record id error",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: fakePatientId,
          encounterId: encounter.id,
          body: {
            ehr_encounter_id: encounter.id,
            vital_type: "bp_systolic",
            vital_value: 120,
            unit: "mmHg",
            measured_at: new Date().toISOString(),
          } satisfies IHealthcarePlatformVital.ICreate,
        },
      );
    },
  );
}
