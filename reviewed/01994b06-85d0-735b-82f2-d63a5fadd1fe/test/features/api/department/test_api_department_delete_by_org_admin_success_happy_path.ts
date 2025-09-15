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
 * Validate that an organization admin can successfully soft-delete a
 * department.
 *
 * Scenario steps:
 *
 * 1. Register and login as system admin; create an organization tenant.
 * 2. Register and login as organization admin for that organization.
 * 3. Organization admin creates a department.
 * 4. Organization admin deletes (soft-deletes) the department.
 * 5. Test asserts the deletion call completes successfully (no error is thrown).
 *
 * Note: Direct validation that the department's record has 'deleted_at' set, or
 * that fetching the department returns soft-deleted status, is not possible in
 * this E2E as no department fetch-by-id API or department list API is
 * available. This test covers the positive/happy case only, assuming the
 * backend contract correctly implements soft-delete. Audit log validation is
 * out-of-scope.
 */
export async function test_api_department_delete_by_org_admin_success_happy_path(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(16);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdminJoin);

  // 2. Create new organization (system admin role in session)
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(3);
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

  // 3. Register and login as organization admin (for this org)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(14);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdminJoin);

  // Login as organization admin (token/session switch)
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdminLogin);

  // 4. Org admin creates a department in the organization
  const deptCode = RandomGenerator.alphaNumeric(5);
  const deptName = RandomGenerator.name(2);
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

  // 5. Org admin deletes (soft-deletes) the department
  await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.erase(
    connection,
    {
      organizationId: organization.id,
      departmentId: department.id,
    },
  );

  // (Best-effort) Assert the deletion call completed without error.
  // There's no endpoint to directly assert 'deleted_at' is set or to refetch the department.
  TestValidator.predicate(
    "department deletion API call completes without error (soft-delete happy path)",
    true,
  );
}
