import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Verifies that a nurse user can access detailed encounter information for a
 * patient record and confirms proper access control and error handling.
 *
 * This scenario covers positive flows for enrollment, login, resource creation,
 * and successful nurse encounter detail access, as well as negative cases:
 * forbidden/nonexistent resource access by the nurse.
 *
 * Steps:
 *
 * 1. Register and login as organization admin.
 * 2. Register and login as nurse.
 * 3. Register and login as medical doctor.
 * 4. Organization admin creates a patient record.
 * 5. Medical doctor creates an encounter for the patient.
 * 6. Nurse logs in and accesses the encounter details (ensures field visibility,
 *    typia.assert for structure).
 * 7. Nurse attempts to access an encounter for a different patient record (should
 *    fail: forbidden).
 * 8. Nurse attempts invalid IDs (should fail: 404).
 */
export async function test_api_nurse_patient_record_encounter_information_access(
  connection: api.IConnection,
) {
  // 1. Register/login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPass = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPass,
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPass,
    },
  });

  // 2. Register/login as nurse
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePass = RandomGenerator.alphaNumeric(10);
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      password: nursePass,
    },
  });
  typia.assert(nurse);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePass,
    },
  });

  // 3. Register/login as medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPass = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorPass,
    },
  });
  typia.assert(doctor);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPass,
    },
  });

  // 4. Organization admin logs in for patient record creation
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPass,
    },
  });
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: orgAdmin.id,
          full_name: RandomGenerator.name(),
          dob: new Date("1990-01-01").toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 5. Medical doctor logs in and creates the encounter
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPass,
    },
  });
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
          notes: "Initial clinical assessment",
        },
      },
    );
  typia.assert(encounter);

  // 6. Nurse logs in and accesses the encounter details
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePass,
    },
  });
  const detail =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "encounter detail for nurse matches actual encounter id",
    detail.id,
    encounter.id,
  );

  // 7. Nurse attempts to access unrelated encounter (should fail/forbidden)
  await TestValidator.error(
    "nurse forbidden for unrelated patient record/encounter",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.at(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          encounterId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Nurse uses invalid IDs (should 404)
  await TestValidator.error(
    "404 on completely invalid patientRecord and encounter IDs",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.at(
        connection,
        {
          patientRecordId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          encounterId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
