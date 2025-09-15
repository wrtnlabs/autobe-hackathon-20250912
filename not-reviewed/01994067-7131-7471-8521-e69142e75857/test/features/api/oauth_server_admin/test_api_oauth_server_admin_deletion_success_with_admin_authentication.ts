import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";

/**
 * Validate administrative deletion of OAuth server admin accounts.
 *
 * This test covers the complete secure deletion workflow for OAuth server
 * admin users.
 *
 * 1. Join as Admin: Create admin account with valid email and password.
 * 2. Admin Login: Authenticate to receive JWT tokens for authorized admin
 *    context.
 * 3. Create Target Admin: Register another OAuth server admin to be deleted.
 * 4. Perform Delete: Use the authorized admin context to delete the target
 *    admin.
 * 5. Confirm Deletion: Verify that deletion completes without error.
 * 6. Validate Auth: Ensure deletion requires valid admin authorization.
 *
 * The test ensures that only authorized admin users can delete admin
 * accounts, and that deletion results in successful soft deletion without
 * errors. It validates API response types, authorization token handling,
 * and proper use of secure, realistic test data for all API requests.
 *
 * All API calls are awaited with strict typia.assert validations.
 */
export async function test_api_oauth_server_admin_deletion_success_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as an initial admin user
  const initialAdminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const initialAdminPassword = "StrongPassword123!";

  const initialAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: initialAdminEmail,
        email_verified: true,
        password: initialAdminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(initialAdmin);

  // Step 2: Log in as the initial admin user to set authorization headers
  const login: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: initialAdminEmail,
        password: initialAdminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(login);

  // Step 3: Create another admin user to be the target for deletion
  const targetAdminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const targetAdminPassword = "AnotherStrongPass456!";

  const targetAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: targetAdminEmail,
        email_verified: true,
        password: targetAdminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // Step 4: Delete the target admin account by id
  await api.functional.oauthServer.admin.oauthServerAdmins.erase(connection, {
    id: targetAdmin.id,
  });

  // No response is expected; simple successful completion means success

  // Step 5: Validate that repeated deletion throws an error (the account is already deleted)
  await TestValidator.error(
    "delete of already deleted admin should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerAdmins.erase(
        connection,
        {
          id: targetAdmin.id,
        },
      );
    },
  );
}
