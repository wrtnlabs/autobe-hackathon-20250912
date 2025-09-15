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
 * This test validates the end-to-end flow for an 'organizationAdmin' updating
 * an org-department assignment within a healthcare platform. It covers full
 * lifecycle: registration and login as system and organization admin,
 * organization and department creation, creating and updating department
 * assignments (including changing department/organization references), and
 * verifying error handling for updates on invalid assignment IDs or with
 * orphaned references. Success is defined by the ability to update a real
 * assignment and see changes reflected in the returned object; failures are
 * validated by ensuring the system rejects updates to nonexistent assignments
 * or with bad references, all while enforcing correct business logic and
 * permissioning. The test uses only provided DTOs and API functions. Audit/log
 * verification is omitted as there is no endpoint for log retrieval in the
 * provided SDK. DTO usage is precise: IHealthcarePlatformDepartment.ICreate and
 * IHealthcarePlatformOrgDepartmentAssignment.ICreate for creation,
 * IHealthcarePlatformOrgDepartmentAssignment.IUpdate for update, and proper
 * response DTOs. Null/undefined field handling is done per DTO requirements.
 */
export async function test_api_org_department_assignment_update_org_admin_flow(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin (to create organization)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdminPass1234",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SysAdminPass1234",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  // 2. Create organization
  const orgCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreate },
    );
  typia.assert(organization);

  // 3. Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "OrgAdmin123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "OrgAdmin123!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create two departments
  const dept1Create = {
    healthcare_platform_organization_id: organization.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department1 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      { organizationId: organization.id, body: dept1Create },
    );
  typia.assert(department1);

  const dept2Create = {
    healthcare_platform_organization_id: organization.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department2 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      { organizationId: organization.id, body: dept2Create },
    );
  typia.assert(department2);

  // 5. Create an org-department assignment for department1
  const odaCreate = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department1.id,
  } satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate;
  const assignment =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
      connection,
      { body: odaCreate },
    );
  typia.assert(assignment);

  // 6. Update the assignment to use department2 instead
  const odaUpdate = {
    healthcare_platform_department_id: department2.id,
  } satisfies IHealthcarePlatformOrgDepartmentAssignment.IUpdate;
  const updatedAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.update(
      connection,
      {
        orgDepartmentAssignmentId: assignment.id,
        body: odaUpdate,
      },
    );
  typia.assert(updatedAssignment);
  TestValidator.equals(
    "department ID was updated",
    updatedAssignment.healthcare_platform_department_id,
    department2.id,
  );

  // 7. Attempt to update non-existent assignment (should fail)
  await TestValidator.error(
    "updating non-existent orgDepartmentAssignment should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.update(
        connection,
        {
          orgDepartmentAssignmentId: typia.random<
            string & tags.Format<"uuid">
          >(),
          body: odaUpdate,
        },
      );
    },
  );

  // 8. Attempt to update with invalid org or department ID (orphaned refs)
  await TestValidator.error(
    "updating with orphaned department ID should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.update(
        connection,
        {
          orgDepartmentAssignmentId: assignment.id,
          body: {
            healthcare_platform_department_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IHealthcarePlatformOrgDepartmentAssignment.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "updating with orphaned organization ID should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.update(
        connection,
        {
          orgDepartmentAssignmentId: assignment.id,
          body: {
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IHealthcarePlatformOrgDepartmentAssignment.IUpdate,
        },
      );
    },
  );
}
