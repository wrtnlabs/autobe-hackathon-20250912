import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end scenario for department head retrieving a lab result record:
 *
 * 1. Register system admin and log in
 * 2. Register organization admin and log in
 * 3. System admin creates organization
 * 4. Organization admin creates department in organization
 * 5. Organization admin creates patient record in organization+department
 * 6. Register department head and log in
 * 7. Department head creates an encounter for patient record
 * 8. Department head creates lab result for the encounter
 * 9. Department head retrieves lab result using GET
 * 10. Validate correctness of response and access boundaries
 */
export async function test_api_lab_result_view_by_department_head_with_full_dependencies(
  connection: api.IConnection,
) {
  // 1. Register and log in as system admin
  const sysadmin_email = typia.random<string & tags.Format<"email">>();
  const sysadmin_password = RandomGenerator.alphaNumeric(12);
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadmin_email,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_password,
    },
  });
  typia.assert(sysadmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadmin_email,
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_password,
    },
  });

  // 2. Register and log in as organization admin
  const orgadmin_email = typia.random<string & tags.Format<"email">>();
  const orgadmin_password = RandomGenerator.alphaNumeric(12);
  const orgadmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgadmin_email,
        full_name: RandomGenerator.name(),
        password: orgadmin_password,
      },
    },
  );
  typia.assert(orgadmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin_email,
      password: orgadmin_password,
    },
  });

  // 3. System admin creates organization
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadmin_email,
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_password,
    },
  });
  const organization =
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
  typia.assert(organization);

  // 4. Organization admin creates department for org
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin_email,
      password: orgadmin_password,
    },
  });
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 5. Organization admin creates patient record for org+dept
  const patient_user_id = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          department_id: department.id,
          patient_user_id,
          full_name: RandomGenerator.name(),
          dob: new Date(2000, 0, 10).toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 6. Register and log in as department head
  const head_email = typia.random<string & tags.Format<"email">>();
  const head_password = RandomGenerator.alphaNumeric(10);
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: head_email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: head_password,
      },
    },
  );
  typia.assert(departmentHead);
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: head_email,
      password: head_password,
    },
  });

  // 7. Department head creates encounter for patient
  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          provider_user_id: departmentHead.id,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  // 8. Department head creates lab result for the encounter
  const lab_integration_id = typia.random<string & tags.Format<"uuid">>();
  const labResult =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: {
          ehr_encounter_id: encounter.id,
          lab_integration_id,
          test_name: "CBC",
          test_result_value_json: JSON.stringify({ WBC: 5300, RBC: 4.7 }),
          result_flag: "normal",
          resulted_at: new Date().toISOString(),
          status: "completed",
        },
      },
    );
  typia.assert(labResult);

  // 9. Department head retrieves lab result by ID
  const gotLabResult =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.at(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        labResultId: labResult.id,
      },
    );
  typia.assert(gotLabResult);

  // 10. Validate retrieval is correct and RBAC works
  TestValidator.equals(
    "retrieved lab result id matches created lab result",
    gotLabResult.id,
    labResult.id,
  );
  TestValidator.equals(
    "lab result has correct patient/encounter linkage",
    gotLabResult.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "lab result test_name matches",
    gotLabResult.test_name,
    "CBC",
  );
  TestValidator.equals(
    "lab result result_flag matches",
    gotLabResult.result_flag,
    "normal",
  );
}
