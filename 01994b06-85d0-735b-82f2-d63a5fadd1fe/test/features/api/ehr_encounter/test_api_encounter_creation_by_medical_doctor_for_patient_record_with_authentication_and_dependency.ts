import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate medical doctor creation of a new patient EHR encounter record via
 * API endpoint.
 *
 * 1. Register a system admin and login (sets up context for creating a valid
 *    patient record).
 * 2. Create a patient record (as admin) with unique organizational and patient
 *    IDs.
 * 3. Register and login as a medical doctor (sets up context for creating an
 *    encounter).
 * 4. As the doctored-in session, attempt to create a valid encounter record
 *    correctly linked to patient and doctor.
 * 5. Assert that the encounter is returned, has linkage IDs set as expected, and
 *    creation succeeded.
 * 6. Perform basic negative testing (unauthenticated creation or bad patient ID
 *    returns error).
 */
export async function test_api_encounter_creation_by_medical_doctor_for_patient_record_with_authentication_and_dependency(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate system admin (for patient record creation)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      },
    });
  typia.assert(admin);

  // Step 2: Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });

  // Step 3: Create patient record
  const patientRecordBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: null,
    patient_user_id: typia.random<string & tags.Format<"uuid">>(),
    external_patient_number: RandomGenerator.alphaNumeric(8),
    full_name: RandomGenerator.name(),
    dob: new Date("1980-01-02T00:00:00Z").toISOString(),
    gender: RandomGenerator.pick(["male", "female", "other", null]),
    status: "active",
    demographics_json: JSON.stringify({ race: "Asian", language: "English" }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;

  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: patientRecordBody,
      },
    );
  typia.assert(patientRecord);

  // Step 4: Register and authenticate medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(),
        npi_number: doctorNpi,
        password: doctorPassword,
        specialty: RandomGenerator.pick([
          "general",
          "cardiology",
          "pediatrics",
          null,
        ]),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(doctor);

  // Login as doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // Step 5: Create encounter as medical doctor
  const encounterBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: doctor.id as string & tags.Format<"uuid">,
    encounter_type: RandomGenerator.pick([
      "office_visit",
      "telemedicine",
      "emergency",
    ]),
    encounter_start_at: new Date().toISOString(),
    encounter_end_at: null,
    status: "active",
    notes: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterBody,
      },
    );
  typia.assert(encounter);

  // Validate linkage
  TestValidator.equals(
    "encounter linked patient_record_id matches patient record",
    encounter.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "encounter provider_user_id matches doctor id",
    encounter.provider_user_id,
    doctor.id,
  );
  TestValidator.equals(
    "encounter status is active",
    encounter.status,
    "active",
  );

  // Step 6: Negative - try to create encounter with invalid patient id
  await TestValidator.error(
    "creating encounter with invalid patient record id fails",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(), // random non-existent UUID
          body: encounterBody,
        },
      );
    },
  );
}
