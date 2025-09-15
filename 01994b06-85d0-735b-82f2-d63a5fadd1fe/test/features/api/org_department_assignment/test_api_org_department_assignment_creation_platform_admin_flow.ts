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
 * Validate organization-department assignment creation workflow as platform
 * system admin.
 *
 * Steps:
 *
 * 1. Register system admin (local credentials: email, name, password)
 * 2. Login as system admin
 * 3. Create a new org (unique code, name, status)
 * 4. Register and login as org admin (for dept creation)
 * 5. Create new department under the org (with valid org uuid, code, name, status)
 * 6. Switch back to system admin (login)
 * 7. Create org-department assignment (system admin creates mapping)
 * 8. Test duplicate assignment (should fail with business error)
 * 9. Test with invalid org/department ids (should return not-found/validation
 *    errors)
 * 10. All success/failure responses type-checked
 */
export async function test_api_org_department_assignment_creation_platform_admin_flow(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = `${RandomGenerator.alphabets(8)}@enterprise-corp.com`;
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // 2. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. Create new organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(2);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // 4. Register and login as org admin
  const orgAdminEmail = `${RandomGenerator.alphabets(8)}@org-admin.com`;
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 5. Create new department in organization
  const deptCode = RandomGenerator.alphaNumeric(6);
  const deptName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: deptCode,
          name: deptName,
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  // 6. Switch back to system admin (login)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 7. Create org-department assignment
  const assignmentInput = {
    healthcare_platform_organization_id: org.id,
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
  TestValidator.equals(
    "assignment organization id equals organization",
    assignment.healthcare_platform_organization_id,
    org.id,
  );
  TestValidator.equals(
    "assignment department id equals department",
    assignment.healthcare_platform_department_id,
    department.id,
  );

  // 8. Attempt to create duplicate assignment: expect business error
  await TestValidator.error("duplicate assignment creation fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.create(
      connection,
      {
        body: assignmentInput,
      },
    );
  });

  // 9. Attempt assignment with invalid org/department IDs
  const fakeUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "assignment with invalid org id fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: fakeUuid,
            healthcare_platform_department_id: department.id,
          } satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "assignment with invalid department id fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: org.id,
            healthcare_platform_department_id: fakeUuid,
          } satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate,
        },
      );
    },
  );
}
