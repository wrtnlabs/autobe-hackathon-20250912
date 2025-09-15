import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test verifies the ability to retrieve a department manager's detailed
 * information correctly when authenticated as the organization admin within the
 * same tenant. It also tests error handling for non-existent department manager
 * IDs and access control by attempting to fetch details using a department
 * manager from a different tenant.
 *
 * 1. Organization Admin signs up and authenticates.
 * 2. Organization Admin creates a Department Manager user.
 * 3. Department Manager user is authenticated.
 * 4. Organization Admin fetches department manager details by valid ID.
 * 5. Validate the department manager details match the created user.
 * 6. Test fetching details with invalid (nonexistent) ID and expect failure.
 * 7. Test access control by attempting to fetch department manager details using a
 *    department manager from another tenant and expect failure.
 */
export async function test_api_department_manager_detail_with_valid_id_and_authentication(
  connection: api.IConnection,
) {
  // 1. Organization Admin signs up
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "SecureP@ss123";
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 2. Organization Admin logs in
  const organizationAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(organizationAdminLoggedIn);

  // 3. OrganizationAdmin creates a Department Manager user in same tenant
  const departmentManagerEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const departmentManagerPassword = "SecureDepM@123";
  const departmentManagerCreated: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: departmentManagerEmail,
        password: departmentManagerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(departmentManagerCreated);

  // 4. Department Manager user logs in
  const departmentManagerLoggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: {
        email: departmentManagerEmail,
        password: departmentManagerPassword,
      } satisfies IEnterpriseLmsDepartmentManager.ILogin,
    });
  typia.assert(departmentManagerLoggedIn);

  // 5. Retrieve Department Manager details as Organization Admin
  const departmentManagerDetails: IEnterpriseLmsDepartmentManager =
    await api.functional.enterpriseLms.departmentManager.departmentmanagers.at(
      connection,
      { departmentmanagerId: departmentManagerCreated.id },
    );
  typia.assert(departmentManagerDetails);

  // 6. Validate the department manager details
  TestValidator.equals(
    "department manager id should match",
    departmentManagerDetails.id,
    departmentManagerCreated.id,
  );
  TestValidator.equals(
    "department manager tenant_id should match",
    departmentManagerDetails.tenant_id,
    organizationAdmin.tenant_id,
  );
  TestValidator.equals(
    "department manager email should match",
    departmentManagerDetails.email,
    departmentManagerCreated.email,
  );
  TestValidator.equals(
    "department manager first name should match",
    departmentManagerDetails.first_name,
    departmentManagerCreated.first_name,
  );
  TestValidator.equals(
    "department manager last name should match",
    departmentManagerDetails.last_name,
    departmentManagerCreated.last_name,
  );
  TestValidator.equals(
    "department manager status should match",
    departmentManagerDetails.status,
    departmentManagerCreated.status,
  );

  // 7. Check that timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "department manager created_at is ISO string",
    typeof departmentManagerDetails.created_at === "string" &&
      departmentManagerDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "department manager updated_at is ISO string",
    typeof departmentManagerDetails.updated_at === "string" &&
      departmentManagerDetails.updated_at.length > 0,
  );

  // 8. Test error when fetching with invalid, non-existent department manager ID
  await TestValidator.error(
    "fetch with non-existent department manager ID should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.departmentmanagers.at(
        connection,
        { departmentmanagerId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 9. Test access restriction by creating department manager in another tenant and attempting to fetch details with original connection (organization admin context)
  const otherTenantId = typia.random<string & tags.Format<"uuid">>();

  // New org admin in other tenant with same connection (headers overwritten)
  const otherAdminEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const otherAdminPassword = "SecureP@ss123";
  const otherOrganizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: otherTenantId,
        email: otherAdminEmail,
        password: otherAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(otherOrganizationAdmin);

  // Department manager in other tenant
  const otherDepartmentManagerEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const otherDepartmentManagerPassword = "SecureDepM@123";
  const otherDepartmentManagerCreated: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: otherDepartmentManagerEmail,
        password: otherDepartmentManagerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(otherDepartmentManagerCreated);

  // 10. Attempt to fetch the other tenant's department manager details using original connection and expect an error due to tenant isolation
  await TestValidator.error(
    "accessing department manager details across tenants should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.departmentmanagers.at(
        connection,
        { departmentmanagerId: otherDepartmentManagerCreated.id },
      );
    },
  );
}
