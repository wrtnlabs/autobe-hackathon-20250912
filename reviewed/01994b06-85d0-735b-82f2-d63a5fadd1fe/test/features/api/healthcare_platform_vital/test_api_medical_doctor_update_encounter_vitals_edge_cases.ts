import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformVital";

export async function test_api_medical_doctor_update_encounter_vitals_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register & login a system admin
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });

  // 2. System admin creates an organization
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(7),
          name: RandomGenerator.paragraph(),
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 3. Register & login organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPass = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPass,
        phone: RandomGenerator.mobile(),
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPass,
      provider: undefined,
      provider_key: undefined,
    },
  });

  // 4. Org admin creates patient and patient record
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientCreate = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1990, 5, 10).toISOString(),
    phone: RandomGenerator.mobile(),
  } as const;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientCreate },
    );
  typia.assert(patient);
  const record =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id,
          department_id: null,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: undefined,
          status: "active",
          demographics_json: undefined,
        },
      },
    );
  typia.assert(record);

  // 5. Register & login medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(13);
  const npi = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(2),
      npi_number: npi,
      password: doctorPassword as string & tags.Format<"password">,
      specialty: RandomGenerator.paragraph({ sentences: 1 }),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(doctor);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword as string & tags.Format<"password">,
    },
  });

  // 6. Doctor creates encounter
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: record.id as string & tags.Format<"uuid">,
          provider_user_id: doctor.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
          notes: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(encounter);

  // 7. Doctor creates initial vitals
  const initialVital =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: {
          ehr_encounter_id: encounter.id,
          vital_type: "heart_rate",
          vital_value: 75,
          unit: "bpm",
          measured_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(initialVital);

  // 8. Patch (update/search) vitals for the encounter (success)
  const patchReq = {
    patient_record_id: record.id as string & tags.Format<"uuid">,
    encounter_id: encounter.id,
    vital_type: "heart_rate",
    // Filter and find all heart_rate entries
  } as const;
  const patchResp =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.index(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: patchReq,
      },
    );
  typia.assert(patchResp);
  // Check HTTP 200 and correct entries
  TestValidator.equals(
    "vitals patched list non-empty",
    patchResp.data.length > 0,
    true,
  );

  // 9. Try PATCH as unassigned doctor (should fail 403 forbidden)
  const unassignedEmail = typia.random<string & tags.Format<"email">>();
  const unassignedPassword = RandomGenerator.alphaNumeric(15);
  const unassignedDoc = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: unassignedEmail,
        full_name: RandomGenerator.name(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: unassignedPassword as string & tags.Format<"password">,
        phone: RandomGenerator.mobile(),
        specialty: null,
      },
    },
  );
  typia.assert(unassignedDoc);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: unassignedEmail,
      password: unassignedPassword as string & tags.Format<"password">,
    },
  });
  await TestValidator.error(
    "Patch forbidden for unassigned doctor",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.index(
        connection,
        {
          patientRecordId: record.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: patchReq,
        },
      );
    },
  );

  // 10. PATCH for finalized/locked encounter (set status completed, then expect 409 or 403)
  // No endpoint to update encounter; simulate by creating a new encounter with status completed.
  const completedEncounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: record.id as string & tags.Format<"uuid">,
          provider_user_id: doctor.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "completed",
          notes: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(completedEncounter);
  await TestValidator.error(
    "Patch forbidden on completed encounter",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.index(
        connection,
        {
          patientRecordId: record.id as string & tags.Format<"uuid">,
          encounterId: completedEncounter.id,
          body: patchReq,
        },
      );
    },
  );

  // 11. PATCH for a deleted patient record (simulate by using a random uuid)
  const fakePatientRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Patch 404 on deleted patient record", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.index(
      connection,
      {
        patientRecordId: fakePatientRecordId,
        encounterId: encounter.id,
        body: patchReq,
      },
    );
  });

  // 12. PATCH for non-existent vital_type
  await TestValidator.error("Patch 404 on missing vital_type", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.index(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: {
          ...patchReq,
          vital_type: "fake_vital_type_nonexistent" as const,
        },
      },
    );
  });
}
