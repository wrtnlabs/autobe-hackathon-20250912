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
 * Verify that unauthorized organization admin (orgAdminA) cannot delete a
 * department from an unrelated organization (orgB/deptB).
 *
 * 1. Register system administrator (sysAdmin).
 * 2. SysAdmin creates orgA and orgB.
 * 3. Register orgAdminA (for orgA) and orgAdminB (for orgB).
 * 4. OrgAdminA logs in, creates deptA in orgA.
 * 5. OrgAdminB logs in, creates deptB in orgB.
 * 6. OrgAdminA logs in, attempts to delete deptB from orgB (should throw
 *    permission error).
 * 7. Confirm deptB still exists (attempt to re-create with same code should fail
 *    with duplicate error).
 */
export async function test_api_department_delete_by_org_admin_permission_error(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: "abcdABCD1234",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(sysAdmin);

  // 2. sysAdmin creates orgA, orgB
  const orgAName = RandomGenerator.name();
  const orgACode = RandomGenerator.alphaNumeric(8);
  const orgA =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgACode,
          name: orgAName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(orgA);

  const orgBName = RandomGenerator.name();
  const orgBCode = RandomGenerator.alphaNumeric(8);
  const orgB =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgBCode,
          name: orgBName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(orgB);

  // 3. Register orgAdminA and orgAdminB
  const orgAdminAEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminBEmail = typia.random<string & tags.Format<"email">>();
  const password = "abcdABCD1234";
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminAEmail,
        full_name: RandomGenerator.name(),
        password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminA);
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminBEmail,
        full_name: RandomGenerator.name(),
        password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminB);

  // 4. orgAdminA logs in and creates deptA in orgA
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminAEmail,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const deptACode = RandomGenerator.alphaNumeric(6);
  const deptA =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: orgA.id,
        body: {
          healthcare_platform_organization_id: orgA.id,
          code: deptACode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(deptA);

  // 5. orgAdminB logs in and creates deptB in orgB
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminBEmail,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const deptBCode = RandomGenerator.alphaNumeric(6);
  const deptB =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: orgB.id,
        body: {
          healthcare_platform_organization_id: orgB.id,
          code: deptBCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(deptB);

  // 6. orgAdminA logs in and attempts to delete deptB from orgB - should fail
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminAEmail,
      password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "orgAdminA cannot delete department from unrelated orgB",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.erase(
        connection,
        {
          organizationId: orgB.id,
          departmentId: deptB.id,
        },
      );
    },
  );

  // 7. Confirm deptB still exists (attempt duplicate code in orgB - should fail)
  await TestValidator.error(
    "cannot re-create department with same code in orgB (deptB not deleted)",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
        connection,
        {
          organizationId: orgB.id,
          body: {
            healthcare_platform_organization_id: orgB.id,
            code: deptBCode,
            name: RandomGenerator.paragraph({ sentences: 2 }),
            status: "active",
          } satisfies IHealthcarePlatformDepartment.ICreate,
        },
      );
    },
  );
}
