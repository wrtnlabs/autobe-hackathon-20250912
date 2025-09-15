import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validate department head access for patient record details retrieval and
 * access control.
 *
 * 1. Organization admin registration and login.
 * 2. Department head registration and login (assigned to same org/department to
 *    allow access).
 * 3. Organization admin creates a patient record within same org/department.
 * 4. Department head fetches patient record (success expected, verify all response
 *    fields).
 * 5. Department head tries to fetch a non-existent patient record (should raise
 *    error).
 * 6. Unrelated department head (from different department/org) attempts to fetch
 *    the existing patient record (should raise business/authorization error).
 */
export async function test_api_patient_record_department_head_access_and_details(
  connection: api.IConnection,
) {
  // 1. Organization admin registration
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdminFullName = RandomGenerator.name();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminFullName,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 2. Department head registration (authorized)
  const headEmail = typia.random<string & tags.Format<"email">>();
  const headPassword = RandomGenerator.alphaNumeric(10);
  const headFullName = RandomGenerator.name();
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: headEmail,
      full_name: headFullName,
      password: headPassword,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(deptHead);

  // login department head for valid session
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: headEmail,
      password: headPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 3. Organization admin logs in to create patient record
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const orgId = orgAdmin.id;
  const deptId = deptHead.id;
  const patientRecordFullName = RandomGenerator.name();
  const patientRecordDob = new Date().toISOString();
  const patientRecordStatus = "active";

  const createdPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgId,
          department_id: deptId,
          patient_user_id: patientUserId,
          full_name: patientRecordFullName,
          dob: patientRecordDob,
          status: patientRecordStatus,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(createdPatient);

  // 4. Department head logs in again (simulate session switch)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: headEmail,
      password: headPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 5. Department head fetches patient record (should succeed)
  const patientRecord =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.at(
      connection,
      {
        patientRecordId: createdPatient.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(patientRecord);
  TestValidator.equals("id matches", patientRecord.id, createdPatient.id);
  TestValidator.equals(
    "organization id matches",
    patientRecord.organization_id,
    orgId,
  );
  TestValidator.equals(
    "department id matches",
    patientRecord.department_id,
    deptId,
  );
  TestValidator.equals(
    "patient user id matches",
    patientRecord.patient_user_id,
    patientUserId,
  );
  TestValidator.equals(
    "status matches",
    patientRecord.status,
    patientRecordStatus,
  );

  // 6. Department head fetches a non-existent record (should error)
  await TestValidator.error(
    "fetching non-existent patient record should error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.at(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Unrelated department head registration + login (negative test)
  const foreignHeadEmail = typia.random<string & tags.Format<"email">>();
  const foreignHeadPassword = RandomGenerator.alphaNumeric(10);
  const foreignHeadFullName = RandomGenerator.name();
  const unrelatedDeptHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: foreignHeadEmail,
        full_name: foreignHeadFullName,
        password: foreignHeadPassword,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(unrelatedDeptHead);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: foreignHeadEmail,
      password: foreignHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Attempt to access patient record (should be denied/error by business rule)
  await TestValidator.error(
    "unrelated department head denied access to patient record",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.at(
        connection,
        {
          patientRecordId: createdPatient.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
