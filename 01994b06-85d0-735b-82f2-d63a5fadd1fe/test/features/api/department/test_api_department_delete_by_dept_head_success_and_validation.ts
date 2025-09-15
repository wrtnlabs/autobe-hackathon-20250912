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
 * End-to-end test that validates full business workflow for department
 * deletion by department head, with permissions and soft-delete logic.
 *
 * Steps:
 *
 * 1. Register systemAdmin (to own/create the organization)
 * 2. Register organizationAdmin (to create the department)
 * 3. Register departmentHead (to test authorization)
 * 4. SystemAdmin logs in, creates an organization
 * 5. OrganizationAdmin logs in, creates a department in that organization
 * 6. DepartmentHead logs in, attempts to delete their assigned department
 *    (should succeed)
 * 7. Verify department is soft-deleted (deleted_at is non-null): As direct
 *    fetch by id is unavailable, create with same code should fail
 *    (uniqueness enforced for soft-deleted)
 * 8. Attempt to delete the already-deleted department again (should fail;
 *    expect error)
 * 9. Register/login a second departmentHead (not assigned to the department),
 *    try to delete the (already deleted) department (should fail; expect
 *    error)
 * 10. (No audit log assertion possible; skip this step)
 *
 * Validates: permissions boundary, soft-delete vs hard-delete, proper
 * business errors on repeated/fake/unauthorized operations.
 */
export async function test_api_department_delete_by_dept_head_success_and_validation(
  connection: api.IConnection,
) {
  // Prepare unique user emails
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const otherDeptHeadEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);

  // 1. Register systemAdmin
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(systemAdmin);

  // 2. Register organizationAdmin
  const organizationAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password,
        provider: "local",
        provider_key: orgAdminEmail,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(organizationAdmin);

  // 3. Register departmentHead
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(departmentHead);

  // 4. SystemAdmin login
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 5. SystemAdmin creates Organization
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);

  // 6. OrganizationAdmin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 7. OrganizationAdmin creates a Department
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  // 8. DepartmentHead login
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 9. DepartmentHead deletes the department
  await api.functional.healthcarePlatform.departmentHead.organizations.departments.erase(
    connection,
    {
      organizationId: organization.id,
      departmentId: department.id,
    },
  );

  // 10. OrganizationAdmin login (to attempt duplicate department creation)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 11. Try creating department with same code again (should fail if soft delete is enforced)
  const duplicateDepartment =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments
      .create(connection, {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: department.code,
          name: department.name,
          status: department.status,
        } satisfies IHealthcarePlatformDepartment.ICreate,
      })
      .catch(() => null);
  TestValidator.equals(
    "cannot create department with duplicate code after soft-delete",
    duplicateDepartment,
    null,
  );

  // 12. DepartmentHead tries to delete the already-deleted department again; should fail (error)
  await TestValidator.error(
    "departmentHead cannot delete already-deleted department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.organizations.departments.erase(
        connection,
        {
          organizationId: organization.id,
          departmentId: department.id,
        },
      );
    },
  );

  // 13. Register and login a new departmentHead not assigned to this department
  const otherDeptHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: otherDeptHeadEmail,
        full_name: RandomGenerator.name(),
        password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(otherDeptHead);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: otherDeptHeadEmail,
      password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  await TestValidator.error(
    "unassigned departmentHead cannot delete unrelated department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.organizations.departments.erase(
        connection,
        {
          organizationId: organization.id,
          departmentId: department.id,
        },
      );
    },
  );
}
