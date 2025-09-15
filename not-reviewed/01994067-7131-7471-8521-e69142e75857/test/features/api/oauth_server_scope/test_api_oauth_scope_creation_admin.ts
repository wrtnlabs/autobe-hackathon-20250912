import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerScope";

/**
 * Test scenario for creating a new OAuth scope as an admin user.
 *
 * Business context:
 *
 * - Admin user must register and log in first to obtain valid JWT tokens.
 * - Only authenticated admin can create OAuth scopes.
 * - Scope codes must be unique.
 *
 * Workflow steps:
 *
 * 1. Register an admin user (join) with a valid unique email and password.
 * 2. Login as the admin user to freshly set authentication token.
 * 3. Create a new OAuth scope with unique code and description.
 * 4. Validate the created OAuth scope response matches the creation data.
 * 5. Attempt to create an OAuth scope with duplicate code to validate uniqueness
 *    enforcement.
 */
export async function test_api_oauth_scope_creation_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    email_verified: true,
    password: "Password123!",
  } satisfies IOauthServerAdmin.ICreate;

  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Admin user login
  const adminLoginBody = {
    email: adminEmail,
    password: "Password123!",
  } satisfies IOauthServerAdmin.ILogin;

  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // Step 3: Create a new OAuth scope with unique code and description
  // Generate unique scope code as a short lowercase string
  const scopeCode = `scope_${RandomGenerator.alphaNumeric(8)}`;
  const scopeCreateBody = {
    code: scopeCode,
    description: `This scope ${scopeCode} grants special permissions.`,
  } satisfies IOauthServerScope.ICreate;

  const createdScope: IOauthServerScope =
    await api.functional.oauthServer.admin.scopes.create(connection, {
      body: scopeCreateBody,
    });
  typia.assert(createdScope);

  // Validate the created scope's code and description match
  TestValidator.equals(
    "created scope code",
    createdScope.code,
    scopeCreateBody.code,
  );
  TestValidator.equals(
    "created scope description",
    createdScope.description,
    scopeCreateBody.description,
  );

  // Step 4: Attempt to create an OAuth scope with duplicate code
  await TestValidator.error(
    "duplicate scope code creation should fail",
    async () => {
      await api.functional.oauthServer.admin.scopes.create(connection, {
        body: scopeCreateBody, // Same code as previous
      });
    },
  );
}
