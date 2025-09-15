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
 * Test that an org admin cannot update a department in another organization.
 *
 * 1. System admin registers and logs in.
 * 2. Register orgAdminA and orgAdminB.
 * 3. System admin creates orgA and orgB.
 * 4. OrgAdminA creates departmentA in orgA.
 * 5. OrgAdminB logs in and creates departmentB in orgB.
 * 6. OrgAdminA logs in and attempts to update departmentB (in orgB). Expect 403
 *    error.
 */
export async function test_api_department_update_by_org_admin_permission_violation(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysadminpw123",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(sysAdminJoin);

  // 2. Register orgAdminA and orgAdminB (do not login yet)
  const orgAdminAEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminAJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminAEmail,
        full_name: RandomGenerator.name(),
        password: "orgadminApw",
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(orgAdminAJoin);

  const orgAdminBEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminBJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminBEmail,
        full_name: RandomGenerator.name(),
        password: "orgadminBpw",
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(orgAdminBJoin);

  // 3. As system admin, create orgA and orgB
  // (already authenticated as sysadmin from join)
  const orgACode = RandomGenerator.alphaNumeric(8);
  const orgA =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgACode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(orgA);

  const orgBCode = RandomGenerator.alphaNumeric(8);
  const orgB =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgBCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(orgB);

  // 4. OrgAdminA logs in and creates departmentA in orgA
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminAEmail,
      password: "orgadminApw",
    },
  });
  const deptACreate =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: orgA.id,
        body: {
          healthcare_platform_organization_id: orgA.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(deptACreate);

  // 5. OrgAdminB logs in and creates departmentB in orgB
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminBEmail,
      password: "orgadminBpw",
    },
  });
  const deptBCreate =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: orgB.id,
        body: {
          healthcare_platform_organization_id: orgB.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(deptBCreate);

  // 6. OrgAdminA logs in to try to update deptB
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminAEmail,
      password: "orgadminApw",
    },
  });
  await TestValidator.error(
    "orgAdminA cannot update department from another organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.update(
        connection,
        {
          organizationId: orgB.id,
          departmentId: deptBCreate.id,
          body: {
            name: "New name should not be permitted",
          },
        },
      );
    },
  );
}
