import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

export async function test_api_patient_record_creation_system_admin_basic_success(
  connection: api.IConnection,
) {
  /**
   * Validates the end-to-end creation of a new patient record by a system
   * administrator, including role/auth flows and proper business entity setup.
   *
   * Steps:
   *
   * 1. Register and login as system admin.
   * 2. Create an organization (captures org ID).
   * 3. Register and login as org admin.
   * 4. Create department in organization (captures dept ID).
   * 5. Register a patient user (captures patient user ID).
   * 6. Switch back and login as system admin.
   * 7. Submit patient record creation using correct org, dept, patient user IDs,
   *    and required properties.
   * 8. Assert that the returned patient record matches submitted data.
   * 9. Attempt creation with invalid organization and patient_user_id to confirm
   *    negative/business error path.
   */
  // 1. Register as system administrator
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: sysAdminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const systemAdminAuth = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: sysAdminJoin,
    },
  );
  typia.assert(systemAdminAuth);

  // 2. Create organization as system admin
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(2);
  const orgCreate = {
    code: orgCode,
    name: orgName,
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: orgCreate,
      },
    );
  typia.assert(organization);

  // 3. Register and login as organization admin (to create department)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdminJoin = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    password: orgAdminPassword,
    provider: "local",
    provider_key: orgAdminEmail,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminJoin,
    },
  );
  typia.assert(orgAdminAuth);

  const orgAdminLogin = {
    email: orgAdminEmail,
    password: orgAdminPassword,
    provider: "local",
    provider_key: orgAdminEmail,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLogin,
  });

  // 4. Create department as organization admin
  const deptCode = RandomGenerator.alphaNumeric(6);
  const deptName = RandomGenerator.paragraph({ sentences: 2 });
  const deptCreate = {
    healthcare_platform_organization_id: organization.id,
    code: deptCode,
    name: deptName,
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: deptCreate,
      },
    );
  typia.assert(department);

  // 5. Register patient user
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientFullName = RandomGenerator.name();
  const dob = new Date(1985, 0, 1).toISOString();
  const patientJoin = {
    email: patientEmail,
    full_name: patientFullName,
    date_of_birth: dob,
    password: patientPassword,
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientAuth = await api.functional.auth.patient.join(connection, {
    body: patientJoin,
  });
  typia.assert(patientAuth);

  // 6. Switch back to system admin for patient record creation
  const sysAdminLogin = {
    email: sysAdminEmail,
    password: sysAdminPassword,
    provider: "local",
    provider_key: sysAdminEmail,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  await api.functional.auth.systemAdmin.login(connection, {
    body: sysAdminLogin,
  });

  // 7. Create patient record as system admin
  const recordFullName = patientFullName;
  const recordDob = dob;
  const recordStatus = "active";
  const recordCreate = {
    organization_id: organization.id,
    department_id: department.id,
    patient_user_id: patientAuth.id,
    full_name: recordFullName,
    dob: recordDob,
    status: recordStatus,
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: recordCreate,
      },
    );
  typia.assert(patientRecord);
  TestValidator.equals(
    "patient record org id matches",
    patientRecord.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "patient record department id matches",
    patientRecord.department_id,
    department.id,
  );
  TestValidator.equals(
    "patient record patient_user_id matches",
    patientRecord.patient_user_id,
    patientAuth.id,
  );
  TestValidator.equals(
    "patient record full_name matches",
    patientRecord.full_name,
    recordFullName,
  );
  TestValidator.equals(
    "patient record dob matches",
    patientRecord.dob,
    recordDob,
  );
  TestValidator.equals(
    "patient record status matches",
    patientRecord.status,
    recordStatus,
  );

  // 8. Negative test: invalid organization id
  await TestValidator.error(
    "create patient record with invalid org id should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
        connection,
        {
          body: {
            ...recordCreate,
            organization_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 9. Negative test: invalid patient user id
  await TestValidator.error(
    "create patient record with invalid patient user id should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
        connection,
        {
          body: {
            ...recordCreate,
            patient_user_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
