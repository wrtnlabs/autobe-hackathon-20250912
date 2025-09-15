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
 * Validate org-department assignment deletion by system admin.
 *
 * This test simulates the complete business flow for permanently deleting an
 * organization-department assignment by a system administrator. It validates
 * the following workflow and asserts both successful and error scenarios:
 *
 * 1. System admin registers (join) and authenticates (login).
 * 2. Organization is created (system admin).
 * 3. Org admin registers and logs in.
 * 4. Org admin creates department under the organization.
 * 5. System admin logs back in (role switch).
 * 6. System admin creates an org-department assignment.
 * 7. System admin deletes the assignment (erase operation).
 * 8. Attempt to delete the same assignment again (should error).
 * 9. Attempt to delete a non-existent assignment (should error).
 *
 * Key validations:
 *
 * - Success removal of the assignment
 * - Error handling of already-deleted/non-existent assignments
 * - Correct role context switching using API logins (no token manipulation)
 * - Exclusive use of valid, type-safe DTOs and error-free API usage
 */
export async function test_api_org_department_assignment_deletion_by_systemadmin(
  connection: api.IConnection,
) {
  // Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // System admin logs in to ensure current session
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);

  // Create organization as system admin
  const orgInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: orgInput,
      },
    );
  typia.assert(organization);

  // Register an organization admin for the organization
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  // Organization admin logs in (ensure role switching)
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // Create department under the organization as organization admin
  const departmentInput = {
    healthcare_platform_organization_id: organization.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: departmentInput,
      },
    );
  typia.assert(department);

  // Switch back to system admin account for assignment creation
  const sysAdminReLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminReLogin);

  // Create org-department assignment as system admin
  const assignmentInput = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department.id,
  } satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate;
  const assignment =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.create(
      connection,
      {
        body: assignmentInput,
      },
    );
  typia.assert(assignment);

  // Erase (delete) the assignment
  await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.erase(
    connection,
    {
      orgDepartmentAssignmentId: assignment.id,
    },
  );

  // Attempt to delete the same assignment again (should error)
  await TestValidator.error(
    "Deleting already deleted org-dept assignment must error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.erase(
        connection,
        {
          orgDepartmentAssignmentId: assignment.id,
        },
      );
    },
  );

  // Attempt to delete a random non-existent assignment (should error)
  await TestValidator.error(
    "Deleting non-existent org-dept assignment must error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.erase(
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
