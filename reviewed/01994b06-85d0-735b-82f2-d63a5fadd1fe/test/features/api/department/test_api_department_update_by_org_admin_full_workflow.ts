import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for updating a healthcare department by organization admin.
 *
 * Steps under test:
 *
 * 1. Register system admin (with unique business email, full name, password)
 * 2. Login as system admin
 * 3. Create a new organization (unique code, name, status)
 * 4. Register organization admin (unique business email, name, password)
 * 5. Login as organization admin
 * 6. Create department under organization (code, name, status)
 * 7. Update department's name, code, and status via org admin
 * 8. Validate updated fields, audit timestamps (updated_at changes), and that
 *    id/org remain same
 * 9. Attempt update with duplicate code (should error), blank name (should
 *    error), unauthorized user (should error)
 * 10. Validate business rule: code and name must be unique within the org,
 *     status valid, only org admin can update
 */
export async function test_api_department_update_by_org_admin_full_workflow(
  connection: api.IConnection,
) {
  // 1. Register system admin (with unique business email, full name, password)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdminPassword!234",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // 2. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdminPassword!234",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. Create a new organization
  const orgInput = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgInput },
    );
  typia.assert(organization);

  // 4. Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "OrgAdmin!234",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 5. Login as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "OrgAdmin!234",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 6. Create department
  const deptInput = {
    healthcare_platform_organization_id: organization.id,
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: deptInput,
      },
    );
  typia.assert(department);
  TestValidator.equals(
    "department org ID matches",
    department.healthcare_platform_organization_id,
    organization.id,
  );

  // 7. Update department
  const updateInput = {
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.name(3),
    status: "archived",
  } satisfies IHealthcarePlatformDepartment.IUpdate;
  const updatedDept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
      connection,
      {
        organizationId: organization.id,
        departmentId: department.id,
        body: updateInput,
      },
    );
  typia.assert(updatedDept);
  TestValidator.equals(
    "dept updated id remains same",
    updatedDept.id,
    department.id,
  );
  TestValidator.equals(
    "dept updated orgID remains same",
    updatedDept.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.notEquals(
    "dept code updated",
    updatedDept.code,
    department.code,
  );
  TestValidator.notEquals(
    "dept name updated",
    updatedDept.name,
    department.name,
  );
  TestValidator.equals("dept status updated", updatedDept.status, "archived");
  TestValidator.notEquals(
    "updated_at changed",
    updatedDept.updated_at,
    department.updated_at,
  );

  // 8. Uniqueness validation: create another with same code
  const codeConflictInput = {
    healthcare_platform_organization_id: organization.id,
    code: updateInput.code,
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  await TestValidator.error(
    "cannot create department with duplicate code",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
        connection,
        {
          organizationId: organization.id,
          body: codeConflictInput,
        },
      );
    },
  );

  // 9. Required field validation: blank name
  await TestValidator.error(
    "cannot update department with blank name",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
        connection,
        {
          organizationId: organization.id,
          departmentId: department.id,
          body: {
            name: "",
          } satisfies IHealthcarePlatformDepartment.IUpdate,
        },
      );
    },
  );

  // 10. Role-based access control: attempt update as system admin (should fail)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdminPassword!234",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "system admin cannot update department via org admin API",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
        connection,
        {
          organizationId: organization.id,
          departmentId: department.id,
          body: {
            name: RandomGenerator.name(2),
          } satisfies IHealthcarePlatformDepartment.IUpdate,
        },
      );
    },
  );
}
