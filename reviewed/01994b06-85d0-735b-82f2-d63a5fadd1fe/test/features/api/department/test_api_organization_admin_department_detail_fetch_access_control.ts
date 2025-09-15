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
 * E2E test for organization admin fetching department details and access
 * control.
 *
 * 1. Register and login as system admin
 * 2. System admin creates a new organization
 * 3. Register and login as organization adminA
 * 4. Organization adminA creates a department in the organization
 * 5. Organization adminA fetches the department successfully
 * 6. Negative: fetch department with invalid departmentId (should fail)
 * 7. Negative: fetch department with invalid organizationId (should fail)
 * 8. Negative: a different organization admin (adminB) attempts fetch (should
 *    fail)
 */
export async function test_api_organization_admin_department_detail_fetch_access_control(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      },
    });
  typia.assert(sysAdmin);

  // 2. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 3. Create a new organization
  const orgInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgInput },
    );
  typia.assert(organization);

  // 4. Register and login as organization adminA
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAPassword = RandomGenerator.alphaNumeric(10);
  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminAEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminAPassword,
        provider: "local",
        provider_key: adminAEmail,
      },
    });
  typia.assert(adminA);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
      provider: "local",
      provider_key: adminAEmail,
    },
  });

  // 5. Organization adminA creates department
  const deptInput = {
    healthcare_platform_organization_id: organization.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(1),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: deptInput,
      },
    );
  typia.assert(department);

  // 6. Organization adminA fetches the department successfully
  const depFetched =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.at(
      connection,
      {
        organizationId: organization.id,
        departmentId: department.id,
      },
    );
  typia.assert(depFetched);
  TestValidator.equals("department id matches", depFetched.id, department.id);
  TestValidator.equals(
    "org id matches",
    depFetched.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals("code matches", depFetched.code, deptInput.code);
  TestValidator.equals("name matches", depFetched.name, deptInput.name);
  TestValidator.equals("status matches", depFetched.status, deptInput.status);

  // 7. Negative: fetch department with invalid departmentId
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("not found with invalid departmentId", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.at(
      connection,
      { organizationId: organization.id, departmentId: randomUuid },
    );
  });

  // 8. Negative: fetch department with invalid organizationId
  await TestValidator.error(
    "not found with invalid organizationId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.at(
        connection,
        { organizationId: randomUuid, departmentId: department.id },
      );
    },
  );

  // 9. Negative: another organization admin (adminB) cannot access
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBPassword = RandomGenerator.alphaNumeric(10);
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminBEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminBPassword,
        provider: "local",
        provider_key: adminBEmail,
      },
    });
  typia.assert(adminB);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
      provider: "local",
      provider_key: adminBEmail,
    },
  });
  await TestValidator.error(
    "admin B cannot access department of organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.at(
        connection,
        {
          organizationId: organization.id,
          departmentId: department.id,
        },
      );
    },
  );
}
