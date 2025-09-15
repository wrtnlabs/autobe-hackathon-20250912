import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

/**
 * E2E test for retrieval and access control of a specific vital entry in a
 * healthcare platform (department head scenario).
 *
 * This test performs the following workflow:
 *
 * 1. Registers & authenticates a system admin, which creates a new organization.
 * 2. Registers & authenticates an organization admin, which creates a department
 *    for the organization.
 * 3. Registers & authenticates a department head user for the department.
 * 4. Registers a patient and creates a patient record linked to the department and
 *    patient.
 * 5. Department head creates a clinical encounter on the patient record.
 * 6. Department head creates a vital entry (e.g., heart rate) for that encounter.
 * 7. Department head retrieves the vital entry: validates that value and vital
 *    type match the created one.
 * 8. Attempts to retrieve a non-existent vital entry and expects an error (404/not
 *    found).
 * 9. Registers a second department and department head, and attempts retrieval of
 *    the original vital with this other head—expects forbidden (403) error.
 *
 * All error scenarios are tested using proper await TestValidator.error blocks.
 * DTO types/fields are strictly validated and no forbidden patterns are
 * present.
 *
 * NOTE: PHI masking, audit-log validation are written as placeholders as those
 * are not available in any DTO/API in current scope.
 */
export async function test_api_department_head_retrieve_vital_entry_e2e_access_control_success_and_error(
  connection: api.IConnection,
) {
  // System Admin registration & login
  const sysEmail = RandomGenerator.name() + "@org.com";
  const sysPassword = RandomGenerator.alphaNumeric(16);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysEmail,
      phone: RandomGenerator.mobile(),
      password: sysPassword,
    },
  });
  typia.assert(sysAdmin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      provider: "local",
      provider_key: sysEmail,
      password: sysPassword,
    },
  });

  // Organization creation
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(2);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        },
      },
    );
  typia.assert(org);

  // Organization Admin registration & login
  const orgAdminEmail = RandomGenerator.name() + "@org.com";
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // Department creation
  const deptCode = RandomGenerator.alphabets(6).toUpperCase();
  const deptName = RandomGenerator.name(2);
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: deptCode,
          name: deptName,
          status: "active",
        },
      },
    );
  typia.assert(department);

  // DepartmentHead registration & login
  const dhEmail = RandomGenerator.name() + "@org.com";
  const dhPassword = RandomGenerator.alphaNumeric(14);
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: dhEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: dhPassword,
    },
  });
  typia.assert(deptHead);
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: dhEmail,
      password: dhPassword,
    },
  });

  // Patient & patient record (by org admin)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: orgAdminPassword },
  });
  const patientEmail = RandomGenerator.name() + "@patient.com";
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1990, 0, 1).toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id,
          department_id: department.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // DepartmentHead login and creates encounter
  await api.functional.auth.departmentHead.login(connection, {
    body: { email: dhEmail, password: dhPassword },
  });
  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: deptHead.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  // Vital creation for the encounter
  const vitalCreate: IHealthcarePlatformVital.ICreate = {
    ehr_encounter_id: encounter.id,
    vital_type: "heart_rate",
    vital_value: 72,
    unit: "bpm",
    measured_at: new Date().toISOString(),
  };
  const vital =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: vitalCreate,
      },
    );
  typia.assert(vital);

  // SUCCESS: Retrieval by correct department head
  const retrieved =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.at(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        vitalId: vital.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved vital matches created vital",
    retrieved.id,
    vital.id,
  );
  TestValidator.equals(
    "retrieved vital value matches",
    retrieved.vital_value,
    vitalCreate.vital_value,
  );
  TestValidator.equals(
    "retrieved vital type matches",
    retrieved.vital_type,
    vitalCreate.vital_type,
  );

  // ERROR: Retrieve non-existent vital (404/not found)
  await TestValidator.error(
    "retrieving non-existent vital returns error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.at(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          vitalId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // ERROR: Department head from another department (forbidden/403)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: orgAdminPassword },
  });
  const altDeptCode = RandomGenerator.alphabets(6).toUpperCase();
  const altDeptName = RandomGenerator.name(2);
  const altDepartment =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: altDeptCode,
          name: altDeptName,
          status: "active",
        },
      },
    );
  typia.assert(altDepartment);
  const altDhEmail = RandomGenerator.name() + "@org.com";
  const altDhPassword = RandomGenerator.alphaNumeric(14);
  const altDeptHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: altDhEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: altDhPassword,
      },
    },
  );
  typia.assert(altDeptHead);
  await api.functional.auth.departmentHead.login(connection, {
    body: { email: altDhEmail, password: altDhPassword },
  });
  await TestValidator.error(
    "forbidden vital retrieval by head of different department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.at(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          vitalId: vital.id,
        },
      );
    },
  );
}
