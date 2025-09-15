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
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates the deletion of a lab result for an encounter by a department head.
 * This includes business workflow setup, RBAC permissions, and edge case
 * checks.
 *
 * Steps:
 *
 * 1. Register and login as system admin, org admin, and department head using
 *    unique test credentials for each.
 * 2. System admin creates an organization.
 * 3. Organization admin creates a department under the organization.
 * 4. Organization admin onboards a department head to the org.
 * 5. Organization admin creates a test patient and a patient record linked to the
 *    department.
 * 6. Department head is responsible for the department; switch to department head
 *    and create an encounter for the patient record.
 * 7. Department head creates a lab result for the encounter.
 * 8. Perform DELETE as the department head: expect success (204) and removal of
 *    lab result.
 * 9. Attempt to delete a lab result from a patient record in another department as
 *    a negative RBAC check—expect forbidden/not found (403/404).
 * 10. Attempt to delete a finalized/locked lab result (manually simulate status if
 *     necessary)—expect conflict/forbidden (409/403).
 * 11. Attempt to delete the same lab result again—should yield not found (404).
 */
export async function test_api_department_head_labresult_delete_permission_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysEmail = RandomGenerator.alphabets(10) + "@enterprise.com";
  const sysPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysEmail as string,
      password: sysPassword,
    },
  });
  typia.assert(sysAdmin);

  // System Admin login (to ensure session for protected org op)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysEmail as string,
      password: sysPassword,
    },
  });

  // 2. Register organization admin
  const orgAdminEmail = RandomGenerator.alphabets(9) + "@deptadmin.com";
  const orgAdminPwd = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPwd,
      },
    },
  );
  typia.assert(orgAdmin);
  // Organization admin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      password: orgAdminPwd,
    },
  });

  // 3. System admin creates an organization
  // (System admin must login context)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysEmail as string,
      password: sysPassword,
    },
  });
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 4. Org admin creates department in organization
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      password: orgAdminPwd,
    },
  });
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id as string & tags.Format<"uuid">,
        body: {
          healthcare_platform_organization_id: org.id as string &
            tags.Format<"uuid">,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(dept);

  // 5. Org admin onboards department head (assign email, full_name for consistency)
  const deptHeadEmail = RandomGenerator.alphabets(10) + "@depthead.com";
  const deptHeadPwd = RandomGenerator.alphaNumeric(12);
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: deptHeadPwd,
    },
  });
  typia.assert(deptHead);

  // Assign Department head in org
  await api.functional.healthcarePlatform.organizationAdmin.departmentheads.create(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: deptHead.full_name,
        phone: deptHead.phone ?? undefined,
      },
    },
  );

  // 6. Org admin creates a patient
  const patientEmail = RandomGenerator.alphabets(10) + "@patient.com";
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail as string & tags.Format<"email">,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1990, 0, 1).toISOString() as string &
            tags.Format<"date-time">,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);

  // 7. Org admin creates patient record attached to the department
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
  typia.assert(patientRecord);

  // 8. DeptHead login
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail as string & tags.Format<"email">,
      password: deptHeadPwd,
    },
  });

  // 9. DeptHead creates an encounter for patient record
  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: deptHead.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  // 10. DeptHead creates lab result for the encounter
  const labResult =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
          lab_integration_id: typia.random<string & tags.Format<"uuid">>(), // Simulated value
          test_name: RandomGenerator.paragraph({ sentences: 2 }),
          test_result_value_json: JSON.stringify({
            value: RandomGenerator.alphaNumeric(5),
          }),
          result_flag: "normal",
          resulted_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          status: "pending",
        },
      },
    );
  typia.assert(labResult);

  // 11. DeptHead deletes lab result (happy path)
  await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.erase(
    connection,
    {
      patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
      encounterId: encounter.id as string & tags.Format<"uuid">,
      labResultId: labResult.id as string & tags.Format<"uuid">,
    },
  );
  // 204 No Content expected; API will throw if not successful

  // 12. Repeated deletion (expect 404)
  await TestValidator.error(
    "repeat deletion should result in not found",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.erase(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          labResultId: labResult.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 13. Permission test: Attempt to delete another department's lab result
  // (create second department, patient record, encounter, lab result, and try to delete cross-dept)
  const dept2 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id as string & tags.Format<"uuid">,
        body: {
          healthcare_platform_organization_id: org.id as string &
            tags.Format<"uuid">,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(dept2);
  // Create a new patient for dept2
  const patient2 =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: (RandomGenerator.alphabets(12) + "@patient.com") as string &
            tags.Format<"email">,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1980, 4, 15).toISOString() as string &
            tags.Format<"date-time">,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient2);
  const patientRecord2 =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id,
          department_id: dept2.id,
          patient_user_id: patient2.id,
          full_name: patient2.full_name,
          dob: patient2.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord2);
  const encounter2 =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord2.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord2.id as string & tags.Format<"uuid">,
          provider_user_id: deptHead.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          status: "active",
        },
      },
    );
  typia.assert(encounter2);
  const labResult2 =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord2.id as string & tags.Format<"uuid">,
        encounterId: encounter2.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounter2.id as string & tags.Format<"uuid">,
          lab_integration_id: typia.random<string & tags.Format<"uuid">>(),
          test_name: RandomGenerator.paragraph({ sentences: 2 }),
          test_result_value_json: JSON.stringify({
            value: RandomGenerator.alphaNumeric(5),
          }),
          result_flag: "normal",
          resulted_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          status: "pending",
        },
      },
    );
  typia.assert(labResult2);
  // Switch to another department head (simulate role boundary - actual enforcement depends on RBAC in API)
  await TestValidator.error(
    "department head cannot delete lab result from another department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.erase(
        connection,
        {
          patientRecordId: patientRecord2.id as string & tags.Format<"uuid">,
          encounterId: encounter2.id as string & tags.Format<"uuid">,
          labResultId: labResult2.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 14. Edge: Attempt to delete a "locked"/finalized result
  // Simulate by creating a result with status "completed"
  const labResultFinal =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
          lab_integration_id: typia.random<string & tags.Format<"uuid">>(),
          test_name: RandomGenerator.paragraph({ sentences: 2 }),
          test_result_value_json: JSON.stringify({
            value: RandomGenerator.alphaNumeric(6),
          }),
          result_flag: "normal",
          resulted_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          status: "completed",
        },
      },
    );
  typia.assert(labResultFinal);
  await TestValidator.error(
    "cannot delete a finalized/locked lab result",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.erase(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          labResultId: labResultFinal.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
