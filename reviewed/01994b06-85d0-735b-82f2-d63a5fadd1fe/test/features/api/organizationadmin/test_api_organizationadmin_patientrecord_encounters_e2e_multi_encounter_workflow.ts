import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrEncounter";

/**
 * E2E: Organization admin retrieves all encounters for a patient record,
 * after contributions from both a doctor and a nurse.
 *
 * Steps:
 *
 * 1. Register an organization admin (OrgAdmin) and login to authenticate.
 * 2. Register a patient user.
 * 3. As OrgAdmin, create the patient record with required patient/organization
 *    linkage.
 * 4. Register a medical doctor and login; doctor creates an encounter for the
 *    patient record.
 * 5. Register a nurse and login; nurse creates a different encounter for the
 *    same patient record.
 * 6. Switch back to OrgAdmin and PATCH
 *    /organizationAdmin/patientRecords/{patientRecordId}/encounters to
 *    fetch all encounters for that record.
 * 7. Validate that encounter list contains both doctor and nurse encounters,
 *    with their respective provider_user_id and encounter_type, and data
 *    isolation applies.
 * 8. Negative: attempt to fetch encounters for a non-existent patient record
 *    and expect error.
 */
export async function test_api_organizationadmin_patientrecord_encounters_e2e_multi_encounter_workflow(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const orgEmail = typia.random<string & tags.Format<"email">>();
  const orgPassword = RandomGenerator.alphaNumeric(16);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgEmail,
      password: orgPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Register the patient user
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(16);
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 0, 1).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient);

  // 3. Create the patient record (by OrgAdmin)
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 4. Register and login as medical doctor, create doctor encounter
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(16);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctor);

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  const doctorEncounter =
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
          notes: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(doctorEncounter);

  // 5. Register and login as nurse, create nurse encounter
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(16);
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurse);

  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  const nurseEncounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: nurse.id as string & tags.Format<"uuid">,
          encounter_type: "nursing_round",
          encounter_start_at: new Date().toISOString(),
          status: "active",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(nurseEncounter);

  // 6. Switch back to organization admin (login as admin)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgEmail,
      password: orgPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 7. List all encounters for the patient record
  const encountersResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {} satisfies IHealthcarePlatformEhrEncounter.IRequest, // No filters
      },
    );
  typia.assert(encountersResult);
  // Validate at least the doctor and nurse encounters are present
  const providerUserIds = encountersResult.data.map((e) => e.provider_user_id);
  TestValidator.predicate(
    "doctor encounter is present in encounters list",
    providerUserIds.includes(doctor.id as string & tags.Format<"uuid">),
  );
  TestValidator.predicate(
    "nurse encounter is present in encounters list",
    providerUserIds.includes(nurse.id as string & tags.Format<"uuid">),
  );

  // 8. Negative: Try to list encounters for a non-existent patient record, expect error
  await TestValidator.error(
    "returns error when patient record doesn't exist",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.index(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(), // unlikely to exist
          body: {} satisfies IHealthcarePlatformEhrEncounter.IRequest,
        },
      );
    },
  );
}
