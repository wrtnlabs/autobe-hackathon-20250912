import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * This End-to-End test verifies the admin user deletion API endpoint.
 *
 * The test executes the following steps:
 *
 * 1. Create a new admin user with generated email and password.
 * 2. Authenticate this admin user to obtain valid JWT tokens.
 * 3. Delete the created admin user using its ID with proper authorization.
 * 4. Attempt to delete an admin with a non-existent UUID to confirm failure.
 * 5. Attempt deletion with unauthorized connection to verify access control.
 *
 * This confirms the deletion endpoint enforces proper permissions, handles
 * errors appropriately, and successfully removes admin users.
 *
 * The test uses SDK-managed tokens via authenticated requests and explicit
 * unauthenticated simulation through cleared headers.
 */
export async function test_api_admin_deletion_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const email = RandomGenerator.alphaNumeric(10) + "@example.com";
  const password = "securepassword123";
  const adminCreateInput = {
    email,
    password,
  } satisfies IFlexOfficeAdmin.ICreate;

  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateInput,
    });
  typia.assert(createdAdmin);

  // 2. Login the same admin user
  const loginInput = {
    email,
    password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loggedAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginInput,
    });
  typia.assert(loggedAdmin);

  // 3. Successfully delete the admin with authenticated token
  await api.functional.flexOffice.admin.admins.eraseAdmin(connection, {
    adminId: createdAdmin.id,
  });

  // 4. Attempt to delete with non-existent admin ID
  await TestValidator.error(
    "deletion with non-existent admin ID should fail",
    async () => {
      await api.functional.flexOffice.admin.admins.eraseAdmin(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Attempt to delete with unauthorized connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.flexOffice.admin.admins.eraseAdmin(unauthConnection, {
      adminId: createdAdmin.id,
    });
  });
}
