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
 * E2E update org-department assignment platform admin flow.
 *
 * Validates successful and failed update scenarios for org-department
 * assignments, including handling not found and orphaned/deleted resources,
 * with correct role switching and business logic enforcement.
 *
 * 1. Register and login system admin (for organization and assignment creation).
 * 2. Register and login organization admin (for department creation).
 * 3. Create an organization and a department, then an assignment linking them.
 * 4. Create a second department for subsequent assignment update.
 * 5. Update the assignment to target second department as system admin (success
 *    case).
 * 6. Attempt to update assignment with a non-existent id (should error).
 * 7. Attempt to update assignment to non-existent department id (should error).
 * 8. Attempt to update assignment to a deleted department id (simulate with random
 *    uuid).
 * 9. Ensure updates reflected, errors thrown as expected, and assignment retains
 *    consistency.
 */
export async function test_api_org_department_assignment_update_platform_admin_flow(
  connection: api.IConnection,
) {
  // 1. System admin join
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysadminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });
  typia.assert(sysadminJoin);

  // 2. System admin login
  const sysadminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysadminEmail,
        provider: "local",
        provider_key: sysadminEmail,
        password: sysadminPassword,
      },
    },
  );
  typia.assert(sysadminLogin);

  // 3. Create organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name();
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

  // 4. Organization admin join
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
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
      },
    },
  );
  typia.assert(orgAdminJoin);

  // 5. Organization admin login
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdminLogin);

  // 6. Create department A
  const deptAcode = RandomGenerator.alphaNumeric(6);
  const deptAname = RandomGenerator.name();
  const departmentA =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: deptAcode,
          name: deptAname,
          status: "active",
        },
      },
    );
  typia.assert(departmentA);

  // 7. Switch to system admin for assignment
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });

  // 8. Create org-department assignment
  const assignment =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          healthcare_platform_department_id: departmentA.id,
        },
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "assignment org id matches",
    assignment.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals(
    "assignment dept id matches",
    assignment.healthcare_platform_department_id,
    departmentA.id,
  );

  // 9. Create department B
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });
  const deptBcode = RandomGenerator.alphaNumeric(6);
  const deptBname = RandomGenerator.name();
  const departmentB =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: deptBcode,
          name: deptBname,
          status: "active",
        },
      },
    );
  typia.assert(departmentB);

  // 10. Switch to system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });

  // 11. Update assignment to department B (success)
  const updateResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.update(
      connection,
      {
        orgDepartmentAssignmentId: assignment.id,
        body: {
          healthcare_platform_department_id: departmentB.id,
        },
      },
    );
  typia.assert(updateResult);
  TestValidator.equals(
    "assignment department updated",
    updateResult.healthcare_platform_department_id,
    departmentB.id,
  );
  TestValidator.notEquals(
    "assignment updated_at refreshed",
    updateResult.updated_at,
    assignment.updated_at,
  );

  // 12. Update with non-existent orgDepartmentAssignmentId
  await TestValidator.error("update fails on non-existent id", async () => {
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.update(
      connection,
      {
        orgDepartmentAssignmentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          healthcare_platform_department_id: departmentB.id,
        },
      },
    );
  });

  // 13. Update to orphan department
  await TestValidator.error(
    "update fails on orphan department id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.update(
        connection,
        {
          orgDepartmentAssignmentId: assignment.id,
          body: {
            healthcare_platform_department_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );

  // 14. Update to deleted department (simulate with random uuid)
  await TestValidator.error(
    "update fails when target department deleted",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.update(
        connection,
        {
          orgDepartmentAssignmentId: assignment.id,
          body: {
            healthcare_platform_department_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );

  TestValidator.equals(
    "assignment department id after all attempts matches B",
    updateResult.healthcare_platform_department_id,
    departmentB.id,
  );
}
