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
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

export async function test_api_medical_doctor_retrieve_specific_vital_e2e_access_control_and_validation(
  connection: api.IConnection,
) {
  // 1. Create system admin, org admin & org setup
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPass = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPass,
    },
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPass,
    },
  });
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );

  // 2. Organization admin setup
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPass = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: orgAdminPass,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPass,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );

  // 3. Create patient & patient record
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPass = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1990-01-01").toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPass,
    },
  });
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1990-01-01").toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id,
          department_id: dept.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        },
      },
    );

  // 4. Create medical doctor, login, and encounter
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctorPass = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNpi,
      password: doctorPass,
    },
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: doctorEmail, password: doctorPass },
  });
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: typia.random<string & tags.Format<"uuid">>(),
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );

  // 5. Doctor adds a vital
  const vitalInput = {
    ehr_encounter_id: encounter.id,
    vital_type: "heart_rate",
    vital_value: 74,
    unit: "bpm",
    measured_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformVital.ICreate;
  const vital =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: vitalInput,
      },
    );
  typia.assert(vital);

  // 6. Doctor retrieves the vital
  const gotVital =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        vitalId: vital.id,
      },
    );
  typia.assert(gotVital);
  TestValidator.equals("vital matches input", gotVital.vital_value, 74);
  TestValidator.equals("vital type matches", gotVital.vital_type, "heart_rate");

  // 7. Try to fetch a non-existent vitalId (should get business error)
  await TestValidator.error(
    "404 not found for non-existent vitalId",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          vitalId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Try to access the vital as a different doctor (should get forbidden)
  const strangerEmail = typia.random<string & tags.Format<"email">>();
  const strangerNpi = RandomGenerator.alphaNumeric(10);
  const strangerPass = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: strangerEmail,
      full_name: RandomGenerator.name(),
      npi_number: strangerNpi,
      password: strangerPass,
    },
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: strangerEmail, password: strangerPass },
  });
  await TestValidator.error(
    "403 forbidden for doctor not on encounter/org",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.vitals.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          vitalId: vital.id,
        },
      );
    },
  );
}
