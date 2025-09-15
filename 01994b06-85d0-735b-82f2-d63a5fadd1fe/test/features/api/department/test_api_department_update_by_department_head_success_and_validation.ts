import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test department update by departmentHead with field and permission
 * validation.
 *
 * 1. Register system admin and create an organization.
 * 2. Register/login as organizationAdmin and create department in org.
 * 3. Register/login as departmentHead.
 * 4. Update department fields as departmentHead (success case).
 * 5. Verify all update, status, and audit fields are correct.
 * 6. Attempt invalid update (blank name/code) as departmentHead and verify error.
 *
 * Validates RBAC, audit, field-level constraints, and input validation.
 */
export async function test_api_department_update_by_department_head_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(16);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });
  typia.assert(systemAdmin);

  // 2. Create organization as sysadmin
  const orgCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const orgName = `${RandomGenerator.paragraph({ sentences: 2 })} Org`;
  const organization =
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
  typia.assert(organization);

  // 3. Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(14);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdmin);
  // Login as organization admin (ensure session/context)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // 4. Create department in org as organization admin
  const deptCode = RandomGenerator.alphaNumeric(4).toUpperCase();
  const deptName = RandomGenerator.name(1).toUpperCase();
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: deptCode,
          name: deptName,
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 5. Register department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(14);
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: deptHeadPassword,
    },
  });
  typia.assert(deptHead);
  // Login as departmentHead
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    },
  });

  // 6. Update department as departmentHead (successful update)
  const newDeptName = `${RandomGenerator.name(1).toUpperCase()} Updated`;
  const newDeptCode = `${RandomGenerator.alphaNumeric(4).toUpperCase()}U`;
  const newStatus = RandomGenerator.pick([
    "active",
    "archived",
    "suspended",
  ] as const);
  const updatedDepartment =
    await api.functional.healthcarePlatform.departmentHead.organizations.departments.update(
      connection,
      {
        organizationId: organization.id,
        departmentId: department.id,
        body: {
          name: newDeptName,
          code: newDeptCode,
          status: newStatus,
        },
      },
    );
  typia.assert(updatedDepartment);

  // 7. Validate department update
  TestValidator.equals(
    "department name updated",
    updatedDepartment.name,
    newDeptName,
  );
  TestValidator.equals(
    "department code updated",
    updatedDepartment.code,
    newDeptCode,
  );
  TestValidator.equals(
    "department status updated",
    updatedDepartment.status,
    newStatus,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedDepartment.updated_at > department.updated_at,
  );

  // 8. Attempt update with invalid data (blank name/code)
  await TestValidator.error(
    "departmentHead update fails with blank name and code",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.organizations.departments.update(
        connection,
        {
          organizationId: organization.id,
          departmentId: department.id,
          body: { name: "", code: "" },
        },
      );
    },
  );
}
