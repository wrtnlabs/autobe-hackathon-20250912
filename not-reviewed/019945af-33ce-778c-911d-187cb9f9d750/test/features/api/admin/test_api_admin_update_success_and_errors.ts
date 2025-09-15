import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * E2E test to validate updating an admin user.
 *
 * This tests the full lifecycle of admin user update, including:
 *
 * - Creating and authenticating admin users
 * - Updating admin details with valid data
 * - Handling error cases for unauthorized access, invalid adminId, and duplicate
 *   email
 * - Ensuring updates are correctly reflected
 *
 * Detailed scenario steps:
 *
 * 1. Create first admin user and login to retrieve auth token.
 * 2. Create a second admin user for update testing.
 * 3. Update second admin with new unique email and password_hash, expect success.
 * 4. Attempt update with invalid adminId, expect 404 error.
 * 5. Attempt to update second admin's email to first admin's email, expect
 *    validation error.
 * 6. Attempt update without authorization token, expect authorization error.
 */
export async function test_api_admin_update_success_and_errors(
  connection: api.IConnection,
) {
  // 1. Create and login first admin user (creator/admin)
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminPassword = "pass1234";

  const firstAdminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: firstAdminEmail,
        password: firstAdminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(firstAdminAuth);

  const firstAdminLoginAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: firstAdminEmail,
        password: firstAdminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(firstAdminLoginAuth);

  // Update connection headers with login token for authorized requests
  connection.headers = { Authorization: firstAdminLoginAuth.token.access };

  // 2. Create second admin user for update target
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminPassword = "pass5678";

  const secondAdminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: secondAdminEmail,
        password: secondAdminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(secondAdminAuth);

  // 3. Update second admin user with new unique email and password_hash
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPasswordHash = RandomGenerator.alphaNumeric(64); // simulate hashed password

  const updatedAdmin: IFlexOfficeAdmin =
    await api.functional.flexOffice.admin.admins.updateAdmin(connection, {
      adminId: secondAdminAuth.id,
      body: {
        email: newEmail,
        password_hash: newPasswordHash,
      } satisfies IFlexOfficeAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);

  TestValidator.equals(
    "Updated admin ID should match",
    updatedAdmin.id,
    secondAdminAuth.id,
  );
  TestValidator.equals(
    "Updated email should be set",
    updatedAdmin.email,
    newEmail,
  );

  // 4. Attempt update with invalid adminId (non-existent) - expect 404 error
  await TestValidator.error(
    "Update with invalid adminId should fail",
    async () => {
      await api.functional.flexOffice.admin.admins.updateAdmin(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(), // random UUID that should not exist
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IFlexOfficeAdmin.IUpdate,
      });
    },
  );

  // 5. Attempt to update second admin's email to first admin's email (duplicate email) - expect validation error
  await TestValidator.error(
    "Update with duplicate email should fail",
    async () => {
      await api.functional.flexOffice.admin.admins.updateAdmin(connection, {
        adminId: secondAdminAuth.id,
        body: {
          email: firstAdminEmail, // duplicate email
        } satisfies IFlexOfficeAdmin.IUpdate,
      });
    },
  );

  // 6. Attempt unauthorized update - create unauthenticated connection
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Unauthorized update attempt should fail",
    async () => {
      await api.functional.flexOffice.admin.admins.updateAdmin(
        unauthenticatedConn,
        {
          adminId: secondAdminAuth.id,
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IFlexOfficeAdmin.IUpdate,
        },
      );
    },
  );
}
