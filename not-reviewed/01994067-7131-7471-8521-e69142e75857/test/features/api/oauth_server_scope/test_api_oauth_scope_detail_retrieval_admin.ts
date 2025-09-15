import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerScope";

/**
 * Test scenario for retrieving the details of a single OAuth scope by ID as
 * an admin user.
 *
 * Steps:
 *
 * 1. Admin user joins to create an account and obtain JWT tokens.
 * 2. Admin user logs in to authenticate and obtain a valid session token.
 * 3. Admin user creates a new OAuth scope with a unique code and description.
 * 4. Using the newly created scope ID, the admin retrieves the detailed scope
 *    information.
 * 5. Verify the retrieved scope details match the created scope.
 * 6. Test error handling by requesting details for an invalid/non-existent
 *    scope ID.
 *
 * Business rules:
 *
 * - Only authorized admins can access scope details.
 * - Scope IDs are validated for existence and format.
 *
 * Success criteria:
 *
 * - Admin can retrieve full details of existing scopes.
 * - The system returns proper errors for invalid IDs.
 */
export async function test_api_oauth_scope_detail_retrieval_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins with a unique email and password
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminCreateBody = {
    email: email,
    email_verified: true,
    password: "ValidPassword123!",
  } satisfies IOauthServerAdmin.ICreate;
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin user logs in to authenticate
  const adminLoginBody = {
    email: email,
    password: "ValidPassword123!",
  } satisfies IOauthServerAdmin.ILogin;
  const loggedInAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Admin creates a new OAuth scope with unique code and description
  const uniqueCode = `scope_${RandomGenerator.alphaNumeric(6)}`;
  const scopeCreateBody = {
    code: uniqueCode,
    description: "Test scope created for E2E retrieval validation",
  } satisfies IOauthServerScope.ICreate;
  const createdScope: IOauthServerScope =
    await api.functional.oauthServer.admin.scopes.create(connection, {
      body: scopeCreateBody,
    });
  typia.assert(createdScope);

  // 4. Retrieve the detailed scope information by the newly created scope ID
  const retrievedScope: IOauthServerScope =
    await api.functional.oauthServer.admin.scopes.at(connection, {
      id: createdScope.id,
    });
  typia.assert(retrievedScope);

  // 5. Verify that retrieved scope details match the created scope (except possibly timestamps)
  TestValidator.equals(
    "retrieved scope ID matches created scope ID",
    retrievedScope.id,
    createdScope.id,
  );
  TestValidator.equals(
    "retrieved scope code matches created scope code",
    retrievedScope.code,
    createdScope.code,
  );
  TestValidator.equals(
    "retrieved scope description matches created scope description",
    retrievedScope.description,
    createdScope.description,
  );

  // 6. Test error handling: requesting details for invalid scope ID
  await TestValidator.error(
    "retrieving scope with invalid ID should fail",
    async () => {
      await api.functional.oauthServer.admin.scopes.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(), // random UUID unlikely to exist
      });
    },
  );
}
