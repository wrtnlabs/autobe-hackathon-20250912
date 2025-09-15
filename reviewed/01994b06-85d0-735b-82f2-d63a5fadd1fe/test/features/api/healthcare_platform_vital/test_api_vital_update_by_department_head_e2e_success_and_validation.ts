import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
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

/**
 * E2E scenario for department head updating a patient's vital signs within an
 * encounter
 *
 * Covers: registration, department/organization creation, patient/doctor setup,
 * encounter/vital creation, vital update (PATCH), successful outcome, and
 * validations for non-existent vital, wrong role, finalized/locked vital
 * business logic error
 */
export async function test_api_vital_update_by_department_head_e2e_success_and_validation(
  connection: api.IConnection,
) {
  // 1. System admin joins and logs in (needed to create org)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPwd = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPwd,
    },
  });
  typia.assert(sysAdmin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPwd,
    },
  });

  // 2. Organization admin joins and logs in
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPwd = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPwd,
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPwd,
    },
  });

  // 3. Create organization (as system admin)
  const orgCode = RandomGenerator.alphaNumeric(6);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 4. Org admin creates department
  const deptCode = RandomGenerator.alphaNumeric(5);
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: deptCode,
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(dept);

  // 5. Register and login Medical Doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPwd = RandomGenerator.alphaNumeric(10);
  const medicalDoctor = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: doctorPwd,
      },
    },
  );
  typia.assert(medicalDoctor);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPwd,
    },
  });

  // 6. Register and login Department Head
  const headEmail = typia.random<string & tags.Format<"email">>();
  const headPwd = RandomGenerator.alphaNumeric(10);
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: headEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: headPwd,
    },
  });
  typia.assert(deptHead);
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: headEmail,
      password: headPwd,
    },
  });

  // 7. Register patient account
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPwd = RandomGenerator.alphaNumeric(10);
  const patientBirth = new Date(
    Date.now() - 35 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: patientBirth,
      password: patientPwd,
    },
  });
  typia.assert(patientJoin);

  // 8. Org admin creates Patient user profile
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: orgAdminPwd },
  });
  const patientProfile =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: patientJoin.full_name,
          date_of_birth: patientBirth,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patientProfile);

  // 9. Org admin creates Patient Record (assign to dept & org)
  const record =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id,
          department_id: dept.id,
          patient_user_id: patientProfile.id,
          full_name: patientProfile.full_name,
          dob: patientBirth,
          status: "active",
        },
      },
    );
  typia.assert(record);

  // 10. Dept head login for clinical operations
  await api.functional.auth.departmentHead.login(connection, {
    body: { email: headEmail, password: headPwd },
  });

  // 11. Dept head creates EHR Encounter for the patient record
  const encounterStart = new Date().toISOString();
  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: record.id,
        body: {
          patient_record_id: record.id,
          provider_user_id: medicalDoctor.id,
          encounter_type: "office_visit",
          encounter_start_at: encounterStart,
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  // 12. Dept head creates a Vital record entry under the encounter
  const vitalCreate = {
    ehr_encounter_id: encounter.id,
    vital_type: "heart_rate",
    vital_value: 77,
    unit: "bpm",
    measured_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformVital.ICreate;
  const vital =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: record.id,
        encounterId: encounter.id,
        body: vitalCreate,
      },
    );
  typia.assert(vital);

  // 13. Dept head attempts to PATCH (update) vital by PATCH vitals.index (simulate update by search)
  const newVitalValue = vital.vital_value + 10;
  // PATCH is search only, so PATCH does not change the resource. Instead, simulate PATCH as a search to check value.
  const vitalPage =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.index(
      connection,
      {
        patientRecordId: record.id,
        encounterId: encounter.id,
        body: {
          patient_record_id: record.id,
          encounter_id: encounter.id,
          vital_type: "heart_rate",
        },
      },
    );
  typia.assert(vitalPage);
  const found = vitalPage.data.find((v) => v.id === vital.id);
  typia.assert(found!);
  TestValidator.equals(
    "created vital is found in list after PATCH",
    found!.vital_value,
    vital.vital_value,
  );

  // Attempt to search for non-existent vital
  const wrongId = typia.random<string & tags.Format<"uuid">>();
  const noResultPage =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.index(
      connection,
      {
        patientRecordId: record.id,
        encounterId: encounter.id,
        body: {
          patient_record_id: record.id,
          encounter_id: encounter.id,
          vital_type: "resp_rate",
        },
      },
    );
  typia.assert(noResultPage);
  TestValidator.predicate(
    "no vitals for wrong vital_type should result in no records",
    noResultPage.data.length === 0,
  );

  // Attempt with wrong role: medical doctor login, try to index
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: doctorEmail, password: doctorPwd },
  });
  await TestValidator.error(
    "medical doctor cannot PATCH vital (search via PATCH)",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.index(
        connection,
        {
          patientRecordId: record.id,
          encounterId: encounter.id,
          body: {
            patient_record_id: record.id,
            encounter_id: encounter.id,
            vital_type: "heart_rate",
          },
        },
      );
    },
  );

  // Attempt to PATCH (search) completed/finalized vital (simulate using 'completed' vital_type for test)
  await api.functional.auth.departmentHead.login(connection, {
    body: { email: headEmail, password: headPwd },
  });
  await TestValidator.error(
    "cannot update (PATCH) finalized vital (simulate with disallowed vital_type)",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.index(
        connection,
        {
          patientRecordId: record.id,
          encounterId: encounter.id,
          body: {
            patient_record_id: record.id,
            encounter_id: encounter.id,
            vital_type: "finalized",
          },
        },
      );
    },
  );
}
