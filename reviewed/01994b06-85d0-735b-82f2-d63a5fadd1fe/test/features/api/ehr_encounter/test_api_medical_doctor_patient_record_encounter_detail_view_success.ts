import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validates that a board-certified medical doctor can view the detailed
 * information of a patient's encounter, enforcing correct ownership and error
 * handling.
 *
 * Steps:
 *
 * 1. Register & login as organization admin
 * 2. Create a patient record as org admin (simulate external patient/user id)
 * 3. Register & login as medical doctor
 * 4. Create a patient encounter for the patient record
 * 5. Retrieve the encounter detail using GET as the original doctor (expect
 *    success)
 * 6. Register & login as a second medical doctor
 * 7. Attempt to retrieve the encounter detail as unauthorized doctor (expect
 *    forbidden)
 * 8. Attempt to retrieve using random (nonexistent) patientRecordId or encounterId
 *    (expect 404)
 */
export async function test_api_medical_doctor_patient_record_encounter_detail_view_success(
  connection: api.IConnection,
) {
  // 1. Register & login org admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@org.test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: adminPassword,
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 2. Create a new patient record (simulate patient_user_id as a random uuid)
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date(1980, 0, 1).toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 3. Register & login as medical doctor (primary actor)
  const doctorEmail = `${RandomGenerator.alphabets(8)}@med.test.com`;
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      password: doctorPassword,
      npi_number: doctorNPI,
    },
  });
  typia.assert(doctor);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // 4. As medical doctor, create a patient encounter
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: doctor.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  // 5. Retrieve the encounter detail (should succeed)
  const encounterDetail =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(encounterDetail);
  TestValidator.equals(
    "encounter record id matches patient record",
    encounterDetail.patient_record_id,
    patientRecord.id as string & tags.Format<"uuid">,
  );
  TestValidator.equals(
    "encounter id matches created id",
    encounterDetail.id,
    encounter.id as string & tags.Format<"uuid">,
  );
  TestValidator.equals(
    "provider_user_id matches doctor",
    encounterDetail.provider_user_id,
    doctor.id as string & tags.Format<"uuid">,
  );

  // 6. Register & login as a second medical doctor (non-owner)
  const doctor2Email = `${RandomGenerator.alphabets(8)}@med.test.com`;
  const doctor2Password = RandomGenerator.alphaNumeric(12);
  const doctor2NPI = RandomGenerator.alphaNumeric(10);
  const doctor2 = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctor2Email,
      full_name: RandomGenerator.name(),
      password: doctor2Password,
      npi_number: doctor2NPI,
    },
  });
  typia.assert(doctor2);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor2Email,
      password: doctor2Password,
    },
  });

  // 7. Attempt to retrieve the encounter as unauthorized doctor (should be forbidden)
  await TestValidator.error(
    "forbidden: non-owner doctor cannot retrieve encounter detail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 8. Attempt to retrieve using random (nonexistent) IDs (should be 404)
  const randomPatientRecordId = typia.random<string & tags.Format<"uuid">>();
  const randomEncounterId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  await TestValidator.error(
    "not found: retrieval with nonexistent patientRecordId",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.at(
        connection,
        {
          patientRecordId: randomPatientRecordId,
          encounterId: encounter.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  await TestValidator.error(
    "not found: retrieval with nonexistent encounterId",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: randomEncounterId,
        },
      );
    },
  );
}
