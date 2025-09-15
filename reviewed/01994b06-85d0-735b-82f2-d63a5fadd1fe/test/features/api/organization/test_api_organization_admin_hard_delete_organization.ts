import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates hard deletion of an organization by a system admin.
 *
 * This test verifies that a system admin can fully delete a healthcare
 * organization (tenant) via the DELETE
 * /healthcarePlatform/systemAdmin/organizations/{organizationId} endpoint.
 * It ensures full removal, which includes (1) registering a new system
 * admin and logging in (local flow), (2) creating a new organization to
 * serve as the deletion target, (3) performing hard deletion as admin, (4)
 * confirming that subsequent delete attempt on the same organization
 * triggers business logic error (organization not found), (5) checks that
 * proper error is thrown if attempting to delete a non-existent or already
 * deleted org.
 *
 * 1. Register and login as a new system admin (local credentials)
 * 2. Create a new organization for testing
 * 3. Perform hard delete on the organization as the admin
 * 4. Attempt to delete the organization again, validate error occurs
 * 5. Attempt to delete a random non-existent organization, validate error
 *    occurs
 *
 * Authorization and cascading/cleanup error scenarios involving dependent
 * entities can only be checked if supported DTO/API exists. With current
 * API set, simulate business error only through org deletion APIs.
 */
export async function test_api_organization_admin_hard_delete_organization(
  connection: api.IConnection,
) {
  // 1. Register a new system admin (local provider)
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@enterprise-corp.com`;
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Login as the newly created system admin
  const login: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(login);
  TestValidator.equals("admin email matches", login.email, adminEmail);

  // 3. Create a new organization (to be deleted)
  const orgCode = `${RandomGenerator.alphaNumeric(10)}`;
  const orgName = `Test Org ${RandomGenerator.name(2)}`;
  const orgStatus = "active";
  const organization: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: orgStatus,
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  TestValidator.equals(
    "organization code matches input",
    organization.code,
    orgCode,
  );
  TestValidator.equals(
    "organization name matches input",
    organization.name,
    orgName,
  );
  TestValidator.equals(
    "organization status matches input",
    organization.status,
    orgStatus,
  );

  // 4. Hard delete the organization by ID
  await api.functional.healthcarePlatform.systemAdmin.organizations.erase(
    connection,
    {
      organizationId: organization.id,
    },
  );

  // 5. Validate that deleting the organization again returns error
  await TestValidator.error(
    "deleting already deleted organization returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.erase(
        connection,
        {
          organizationId: organization.id,
        },
      );
    },
  );

  // 6. Validate deleting non-existent random org returns error
  const nonExistentOrgId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent organization returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.erase(
        connection,
        {
          organizationId: nonExistentOrgId,
        },
      );
    },
  );
}
