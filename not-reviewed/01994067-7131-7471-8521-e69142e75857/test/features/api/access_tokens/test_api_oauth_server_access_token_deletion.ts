import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";

/**
 * This test validates the process of authenticating as an OAuth server
 * admin, then deleting an access token by its UUID. It covers:
 *
 * - Admin user join
 * - Admin user login
 * - Successful deletion of an existing access token
 * - Error when trying to delete a non-existent token
 * - Error when an unauthenticated user tries to delete a token
 *
 * Steps:
 *
 * 1. Perform admin join with realistic email and password
 * 2. Perform admin login with same credentials
 * 3. Simulate creating an access token UUID to delete
 * 4. Delete the access token by UUID and assert success
 * 5. Attempt to delete a random non-existent UUID and assert error
 * 6. Attempt to delete token without login and assert error
 */
export async function test_api_oauth_server_access_token_deletion(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPass1234";
  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user logs in
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Simulate creating an access token UUID to delete
  // Since no create API for token is given, we generate a random UUID to act as token ID
  const validTokenId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete the access token by UUID and assert success
  await api.functional.oauthServer.admin.accessTokens.erase(connection, {
    id: validTokenId,
  });

  // 5. Attempt to delete a random non-existent UUID and expect error
  const nonExistentTokenId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting a non-existent access token should throw",
    async () => {
      await api.functional.oauthServer.admin.accessTokens.erase(connection, {
        id: nonExistentTokenId,
      });
    },
  );

  // 6. Attempt to delete token without login and expect error
  // Create unauthenticated connection by clearing headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete access token",
    async () => {
      await api.functional.oauthServer.admin.accessTokens.erase(
        unauthConnection,
        {
          id: validTokenId,
        },
      );
    },
  );
}
