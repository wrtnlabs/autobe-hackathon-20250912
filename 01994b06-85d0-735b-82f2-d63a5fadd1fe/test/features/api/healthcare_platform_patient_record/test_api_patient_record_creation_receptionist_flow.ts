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
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Tests the end-to-end receptionist patient record workflow:
 *
 * 1. Register as system admin and login to create an organization
 * 2. Register as organization admin, login, and create department in that org
 * 3. Register as receptionist, login
 * 4. Register a patient user (as receptionist)
 * 5. Receptionist creates a patient record for that patient user in the
 *    org/department
 * 6. Validate successful creation with correct associations
 * 7. Negative: Try creating with wrong org/department/patient_user_id (should
 *    error)
 * 8. Negative: Receptionist attempts to create in an unauthorized org (should
 *    error)
 */
export async function test_api_patient_record_creation_receptionist_flow(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysadmin_email = typia.random<string & tags.Format<"email">>();
  const sysadmin_password = "Abcd1234!";
  const sysadmin_join_body = {
    email: sysadmin_email,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: sysadmin_email,
    password: sysadmin_password,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysadmin_join_body,
  });
  typia.assert(sysadmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadmin_email,
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create organization as system admin
  const org_code = RandomGenerator.alphaNumeric(8);
  const org_body = {
    code: org_code,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: org_body },
    );
  typia.assert(organization);

  // 3. Register as organization admin
  const orgadmin_email = typia.random<string & tags.Format<"email">>();
  const orgadmin_password = "OrgAdmin1234!";
  const orgadmin_join_body = {
    email: orgadmin_email,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: orgadmin_password,
    provider: undefined,
    provider_key: undefined,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgadmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgadmin_join_body },
  );
  typia.assert(orgadmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin_email,
      password: orgadmin_password,
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create department within org
  const dept_code = RandomGenerator.alphaNumeric(5);
  const dept_body = {
    healthcare_platform_organization_id: organization.id,
    code: dept_code,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: dept_body,
      },
    );
  typia.assert(department);

  // 5. Register as receptionist
  const receptionist_email = typia.random<string & tags.Format<"email">>();
  const receptionist_full_name = RandomGenerator.name();
  const receptionist_join_body = {
    email: receptionist_email,
    full_name: receptionist_full_name,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionist_join_body,
  });
  typia.assert(receptionist);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist_email,
      password: undefined!,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 6. Receptionist creates patient user
  const patient_email = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string;
  const patient_full_name = RandomGenerator.name();
  const patient_dob = new Date("1990-01-01T00:00:00.000Z").toISOString();
  const patient_join_body = {
    email: patient_email,
    full_name: patient_full_name,
    date_of_birth: patient_dob,
    phone: RandomGenerator.mobile(),
    password: undefined,
    provider: undefined,
    provider_key: undefined,
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient = await api.functional.auth.patient.join(connection, {
    body: patient_join_body,
  });
  typia.assert(patient);

  // 7. Receptionist creates patient record
  const patient_record_body = {
    organization_id: organization.id,
    department_id: department.id,
    patient_user_id: patient.id,
    external_patient_number: RandomGenerator.alphaNumeric(10),
    full_name: patient_full_name,
    dob: patient_dob,
    gender: "other",
    status: "active",
    demographics_json: JSON.stringify({ lang: "en", notes: "N/A" }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patient_record =
    await api.functional.healthcarePlatform.receptionist.patientRecords.create(
      connection,
      {
        body: patient_record_body,
      },
    );
  typia.assert(patient_record);

  // Validate patient record fields
  TestValidator.equals(
    "patient record organization_id matches",
    patient_record.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "patient record department_id matches",
    patient_record.department_id,
    department.id,
  );
  TestValidator.equals(
    "patient record patient_user_id matches",
    patient_record.patient_user_id,
    patient.id,
  );
  TestValidator.equals(
    "patient record full_name matches",
    patient_record.full_name,
    patient_full_name,
  );
  TestValidator.equals(
    "patient record dob matches",
    patient_record.dob,
    patient_dob,
  );

  // Negative test: missing/wrong foreign keys
  await TestValidator.error("should fail with wrong org id", async () => {
    await api.functional.healthcarePlatform.receptionist.patientRecords.create(
      connection,
      {
        body: {
          ...patient_record_body,
          organization_id: typia.random<string & tags.Format<"uuid">>(), // wrong org id
        },
      },
    );
  });
  await TestValidator.error(
    "should fail with wrong department id",
    async () => {
      await api.functional.healthcarePlatform.receptionist.patientRecords.create(
        connection,
        {
          body: {
            ...patient_record_body,
            department_id: typia.random<string & tags.Format<"uuid">>(), // wrong dept id
          },
        },
      );
    },
  );
  await TestValidator.error(
    "should fail with wrong patient_user_id",
    async () => {
      await api.functional.healthcarePlatform.receptionist.patientRecords.create(
        connection,
        {
          body: {
            ...patient_record_body,
            patient_user_id: typia.random<string & tags.Format<"uuid">>(), // wrong patient user id
          },
        },
      );
    },
  );

  // Negative test: receptionist not authorized for another org
  // Register second organization
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadmin_email,
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(org2);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist_email,
      password: undefined!,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  await TestValidator.error(
    "Receptionist cannot create patient record in unauthorized org",
    async () => {
      await api.functional.healthcarePlatform.receptionist.patientRecords.create(
        connection,
        {
          body: {
            ...patient_record_body,
            organization_id: org2.id,
          },
        },
      );
    },
  );
}
