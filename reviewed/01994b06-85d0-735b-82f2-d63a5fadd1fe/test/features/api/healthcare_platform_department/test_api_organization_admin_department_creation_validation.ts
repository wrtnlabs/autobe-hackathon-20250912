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
 * Validate creation and uniqueness constraints for healthcare platform
 * departments.
 *
 * 1. Register and login as system admin to create a new organization.
 * 2. Register and login as organization admin.
 * 3. Organization admin creates a department (valid code, name, status).
 * 4. Confirm department contents and ensure unique code+name within organization.
 * 5. Negative case: duplicate code/name triggers unique constraint error.
 */
export async function test_api_organization_admin_department_creation_validation(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "admin1234",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // 2. Create organization as system admin
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name();
  const orgStatus = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
  ] as const);
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: orgStatus,
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  TestValidator.equals("organization code matches", organization.code, orgCode);

  // 3. Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "orgadmin1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgadmin1234",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create department with valid unique code and name
  const deptCode = RandomGenerator.alphaNumeric(5);
  const deptName = RandomGenerator.name();
  const deptStatus = RandomGenerator.pick([
    "active",
    "archived",
    "pending",
  ] as const);
  const deptInput = {
    healthcare_platform_organization_id: organization.id,
    code: deptCode,
    name: deptName,
    status: deptStatus,
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
    "department organization id matches",
    department.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals("department code matches", department.code, deptCode);
  TestValidator.equals("department name matches", department.name, deptName);
  TestValidator.equals(
    "department status matches",
    department.status,
    deptStatus,
  );

  // 5. Attempt to create department with duplicate code (should fail)
  await TestValidator.error(
    "duplicate department code should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
        connection,
        {
          organizationId: organization.id,
          body: { ...deptInput, name: RandomGenerator.name() },
        },
      );
    },
  );
  // Attempt to create department with duplicate name (should fail)
  await TestValidator.error(
    "duplicate department name should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
        connection,
        {
          organizationId: organization.id,
          body: { ...deptInput, code: RandomGenerator.alphaNumeric(5) },
        },
      );
    },
  );
}
