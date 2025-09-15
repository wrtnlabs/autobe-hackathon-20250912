import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates organization admin can create and assign a department to an
 * organization, and exercises failure cases for duplicate and invalid inputs.
 *
 * 1. Register and login as a system admin (with a business email)
 * 2. Create a new organization as system admin
 * 3. Register and login as organization admin with a unique email
 * 4. Create a department under the organization as org admin
 * 5. As org admin, create org-department assignment (success)
 * 6. Try to create the same assignment again (should fail - duplicate)
 * 7. Attempt assignment with invalid (non-existent) org & department IDs (should
 *    fail)
 */
export async function test_api_org_department_assignment_creation_org_admin_flow(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const systemAdminEmail = RandomGenerator.alphabets(8) + "@company.com";
  const systemAdminJoin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: systemAdminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: systemAdminEmail,
        password: "SysAdmin!234",
      },
    },
  );
  typia.assert(systemAdminJoin);

  // 2. System admin login
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: systemAdminEmail,
        provider: "local",
        provider_key: systemAdminEmail,
        password: "SysAdmin!234",
      },
    },
  );
  typia.assert(sysAdminLogin);

  // 3. System admin creates organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(organization);

  // 4. Register and login as organization admin
  const orgAdminEmail = RandomGenerator.alphabets(8) + "@company.com";
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        password: "OrgAdmin#5678",
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdminJoin);

  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "OrgAdmin#5678",
      },
    },
  );
  typia.assert(orgAdminLogin);

  // 5. Org admin creates department for organization
  const deptBody = {
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
        body: deptBody,
      },
    );
  typia.assert(department);

  // 6. Org admin creates org-department assignment (success)
  const assignmentBody = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department.id,
  } satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate;
  const assignment =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
      connection,
      {
        body: assignmentBody,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "Assignment org and department IDs match",
    assignment.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals(
    "Assignment department ID matches",
    assignment.healthcare_platform_department_id,
    department.id,
  );

  // 7. Attempt duplicate assignment (should fail)
  await TestValidator.error(
    "Duplicate org-department assignment should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
        connection,
        {
          body: assignmentBody,
        },
      );
    },
  );

  // 8. Attempt assignment with invalid org or department (should fail)
  await TestValidator.error(
    "Assignment with non-existent org/department IDs should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            healthcare_platform_department_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
}
