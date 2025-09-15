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
 * Validate organization-department assignment deletion by organization admin.
 *
 * 1. Register and login as a system admin.
 * 2. System admin creates a new organization (unique code and name).
 * 3. Register and login as a new organization admin.
 * 4. Organization admin creates a department under the organization.
 * 5. Organization admin assigns the newly created department to the organization.
 * 6. Delete the assignment as the organization admin (should succeed).
 * 7. Attempt to delete again (should error/idempotent—error expected).
 * 8. Attempt to delete a non-existent assignment (should error, 404 or forbidden).
 */
export async function test_api_org_department_assignment_deletion_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const sysAdminEmail = `${RandomGenerator.alphaNumeric(8)}@sysadmin.example.com`;
  const sysAdminPassword = RandomGenerator.alphaNumeric(16);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(systemAdmin);

  // 2. System admin creates organization
  const orgCode = RandomGenerator.alphaNumeric(6);
  const orgName = RandomGenerator.paragraph({ sentences: 2 });
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

  // 3. Register org admin
  const orgAdminEmail = `${RandomGenerator.alphaNumeric(8)}@orgadmin.example.com`;
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const organizationAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(organizationAdmin);

  // 4. Org admin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // 5. Org admin creates department
  const deptCode = RandomGenerator.alphaNumeric(5);
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: deptCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 6. Org admin creates org-department assignment
  const assignment =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          healthcare_platform_department_id: department.id,
        },
      },
    );
  typia.assert(assignment);

  // 7. Org admin deletes the assignment (should succeed)
  await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.erase(
    connection,
    {
      orgDepartmentAssignmentId: assignment.id,
    },
  );

  // 8. Try to delete again (should error)
  await TestValidator.error(
    "deleting the same assignment again should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.erase(
        connection,
        {
          orgDepartmentAssignmentId: assignment.id,
        },
      );
    },
  );

  // 9. Try to delete a non-existent assignment (should error/404/forbidden)
  await TestValidator.error(
    "deleting non-existent assignment should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.erase(
        connection,
        {
          orgDepartmentAssignmentId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
