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
 * Validates organization admin's department update negative scenarios.
 *
 * - Trying to update a department with a duplicate code within the org (triggers
 *   unique constraint error)
 * - Attempting to update with both name and code missing (should fail validation)
 * - Trying to update a deleted (archived) department (should be rejected)
 * - Updating to invalid status (not a business status)
 *
 * Steps:
 *
 * 1. Register as system admin
 * 2. Create organization
 * 3. Register organization admin, login
 * 4. Create two departments
 * 5. Delete/archive one department
 * 6. Run invalid update attempts for all scenarios and assert errors
 */
export async function test_api_department_update_by_org_admin_validation_error(
  connection: api.IConnection,
) {
  // 1. System admin onboard and create org
  const sysEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysEmail,
      password: "SysAdmPw2023!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  const organizationInput = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: organizationInput },
    );
  typia.assert(organization);

  // 2. Onboard organization admin for org, login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "TestOrgAdmin1!",
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "TestOrgAdmin1!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create two departments (for code duplication and deletion testing)
  const deptCode1 = RandomGenerator.alphaNumeric(5);
  const deptCode2 = RandomGenerator.alphaNumeric(5);
  const department1 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: deptCode1,
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department1);

  const department2 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: deptCode2,
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department2);

  // 4. Archive department2 (soft delete)
  const softDeletedAt = new Date().toISOString();
  const archived =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
      connection,
      {
        organizationId: organization.id,
        departmentId: department2.id,
        body: {
          deleted_at: softDeletedAt,
        } satisfies IHealthcarePlatformDepartment.IUpdate,
      },
    );
  typia.assert(archived);
  TestValidator.equals(
    "department is archived",
    archived.deleted_at,
    softDeletedAt,
  );

  // 5. Negative update attempts
  // (a) Duplicate code update
  await TestValidator.error(
    "should reject department code duplicate",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
        connection,
        {
          organizationId: organization.id,
          departmentId: department1.id,
          body: {
            code: deptCode2,
          } satisfies IHealthcarePlatformDepartment.IUpdate,
        },
      );
    },
  );

  // (b) Missing fields (not allowed both missing, here test at least missing code)
  await TestValidator.error(
    "should reject update with empty body (no updatable fields)",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
        connection,
        {
          organizationId: organization.id,
          departmentId: department1.id,
          body: {},
        },
      );
    },
  );

  // (c) Attempt update on deleted/archived department
  await TestValidator.error(
    "should reject update to archived department",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
        connection,
        {
          organizationId: organization.id,
          departmentId: department2.id,
          body: {
            name: "Attempt Rename",
          } satisfies IHealthcarePlatformDepartment.IUpdate,
        },
      );
    },
  );

  // (d) Invalid status update
  await TestValidator.error("should reject invalid status update", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
      connection,
      {
        organizationId: organization.id,
        departmentId: department1.id,
        body: {
          status: "foo-bar-invalid-status",
        } satisfies IHealthcarePlatformDepartment.IUpdate,
      },
    );
  });
}
