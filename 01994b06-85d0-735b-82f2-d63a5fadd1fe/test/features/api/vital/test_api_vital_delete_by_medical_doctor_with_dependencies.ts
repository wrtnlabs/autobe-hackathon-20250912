import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

/**
 * End-to-end test to verify deletion of a vital sign entry by a medical doctor.
 *
 * The workflow covers full RBAC boundaries, data setup, and all dependencies:
 *
 * 1. System admin onboard, login, and org creation
 * 2. Organization admin onboard, login, and department creation
 * 3. Patient record creation for department/org
 * 4. Medical doctor onboard and login
 * 5. Doctor creates encounter for patient
 * 6. Doctor adds a vital to the encounter
 * 7. Doctor performs the delete on the vital
 */
export async function test_api_vital_delete_by_medical_doctor_with_dependencies(
  connection: api.IConnection,
) {
  // 1. System admin onboard
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(systemAdmin);

  // 2. System admin login
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 3. Organization creation
  const orgCode = RandomGenerator.alphaNumeric(6);
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 4. Organization admin onboard
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdmin);

  // 5. Organization admin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: undefined,
      provider_key: undefined,
    },
  });

  // 6. Department creation
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 7. Patient record creation
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          department_id: department.id,
          patient_user_id: patientUserId,
          external_patient_number: RandomGenerator.alphaNumeric(10),
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          gender: RandomGenerator.pick(["male", "female", "other"]) as string,
          status: "active",
          demographics_json: "{}",
        },
      },
    );
  typia.assert(patient);

  // 8. Medical doctor onboard
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const medicalDoctor = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(),
        npi_number: doctorNpi,
        password: doctorPassword as string & tags.Format<"password">,
        specialty: RandomGenerator.paragraph({ sentences: 2 }),
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(medicalDoctor);

  // 9. Medical doctor login
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword as string & tags.Format<"password">,
    },
  });

  // 10. Create new encounter for the patient by the doctor
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patient.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patient.id as string & tags.Format<"uuid">,
          provider_user_id: medicalDoctor.id as string & tags.Format<"uuid">,
          encounter_type: RandomGenerator.pick([
            "office_visit",
            "emergency",
            "inpatient_admission",
          ]),
          encounter_start_at: new Date().toISOString(),
          encounter_end_at: null,
          status: "active",
          notes: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(encounter);

  // 11. Create a vital sign for the encounter
  const vitalType = RandomGenerator.pick([
    "heart_rate",
    "bp_systolic",
    "bp_diastolic",
    "temp_c",
  ]);
  const vitalUnits: Record<string, string> = {
    heart_rate: "bpm",
    bp_systolic: "mmHg",
    bp_diastolic: "mmHg",
    temp_c: "C",
  };
  const vitalValue: number =
    vitalType === "heart_rate"
      ? 60 + Math.floor(Math.random() * 40)
      : vitalType === "bp_systolic"
        ? 100 + Math.floor(Math.random() * 40)
        : vitalType === "bp_diastolic"
          ? 60 + Math.floor(Math.random() * 20)
          : 36.5 + Math.random();
  const vital =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patient.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
          vital_type: vitalType,
          vital_value: vitalValue,
          unit: vitalUnits[vitalType],
          measured_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(vital);

  // 12. Delete the vital as medical doctor
  await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.erase(
    connection,
    {
      patientRecordId: patient.id as string & tags.Format<"uuid">,
      encounterId: encounter.id as string & tags.Format<"uuid">,
      vitalId: vital.id as string & tags.Format<"uuid">,
    },
  );
}
