import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * This test validates the deletion functionality for existing FlexOffice
 * admin permissions.
 *
 * The flow begins by creating an admin user through the join API endpoint,
 * ensuring a valid admin account exists. Subsequently, the admin logs in to
 * establish a valid authenticated session. With this authenticated context,
 * the test attempts to delete a permission specified by a UUID.
 *
 * Test Steps:
 *
 * 1. Create a new admin using the /auth/admin/join endpoint.
 * 2. Log in as the created admin using /auth/admin/login to get fresh
 *    authentication tokens.
 * 3. Generate a random UUID as a valid permission ID to delete.
 * 4. Invoke the DELETE /flexOffice/admin/permissions/{id} API with this ID.
 * 5. Confirm the deletion call completes as expected (void return).
 *
 * This test confirms the authorization and correctness of permission
 * deletion functionality. Only authorized admin users should be able to
 * delete permissions. It further ensures type safety and compliance with
 * API contracts using typia assertions.
 */
export async function test_api_permission_delete_existing_permission(
  connection: api.IConnection,
) {
  // 1. Admin user creation (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePass123";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(createdAdmin);

  // 2. Admin login to refresh authentication
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. Generate a random UUID for permission ID to delete
  const permissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Invoke delete permission API with generated ID
  await api.functional.flexOffice.admin.permissions.erasePermission(
    connection,
    {
      id: permissionId,
    },
  );

  // No return value, so just confirm no exceptions are thrown
  // Additional tests for unauthorized or invalid ID cases are out of scope here.
}
