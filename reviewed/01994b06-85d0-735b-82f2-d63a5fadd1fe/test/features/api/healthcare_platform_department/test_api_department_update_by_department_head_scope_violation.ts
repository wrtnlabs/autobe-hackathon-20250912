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
 * Validate that a department head cannot update a department outside their
 * scope.
 *
 * This test ensures RBAC boundaries are respected: department heads should only
 * be able to update departments they administrate. Steps:
 *
 * 1. Register a systemAdmin and login.
 * 2. Create organization 1 & 2 as systemAdmin.
 * 3. Register organizationAdmin and login.
 * 4. Create department1 in org1
 * 5. Create department2 in org2
 * 6. Register/join departmentHead1 and login.
 * 7. Attempt to update department2 as departmentHead1 (should be forbidden)
 */
export async function test_api_department_update_by_department_head_scope_violation(
  connection: api.IConnection,
) {
  // 1. Register systemAdmin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create organization 1
  const org1 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org1);

  // 2b. Create organization 2
  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org2);

  // 3. Register organizationAdmin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail,
      full_name: RandomGenerator.name(),
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create department1 in org1 (for assignment semantics)
  const dept1 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org1.id,
        body: {
          healthcare_platform_organization_id: org1.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(dept1);

  // 5. Create department2 in org2 (target for scope-violating access)
  const dept2 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org2.id,
        body: {
          healthcare_platform_organization_id: org2.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(dept2);

  // 6. Register departmentHead1 and login
  const deptHead1Email = typia.random<string & tags.Format<"email">>();
  const deptHead1Password = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHead1Email,
      full_name: RandomGenerator.name(),
      password: deptHead1Password,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHead1Email,
      password: deptHead1Password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 7. Attempt to update department2 as deptHead1 (should fail due to scope violation)
  await TestValidator.error(
    "departmentHead forbidden from updating department in unassigned org",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.organizations.departments.update(
        connection,
        {
          organizationId: org2.id,
          departmentId: dept2.id,
          body: {
            name: "HACKED NAME (attempted)",
          } satisfies IHealthcarePlatformDepartment.IUpdate,
        },
      );
    },
  );
}
