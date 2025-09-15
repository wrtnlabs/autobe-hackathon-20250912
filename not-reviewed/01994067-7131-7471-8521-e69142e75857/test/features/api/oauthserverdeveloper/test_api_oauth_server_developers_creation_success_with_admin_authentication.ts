import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * Validates the creation of a new OAuth server developer successfully under
 * the authorization of an administrator account.
 *
 * This test performs the following steps in detail:
 *
 * 1. Create a new administrator account with unique email and password; email
 *    verified is set to true.
 * 2. Log in with the created administrator account to obtain authorization
 *    token.
 * 3. Using the authorized admin connection, create a new OAuth server
 *    developer account with a unique developer email, verified email flag,
 *    and a password hash.
 * 4. Validate that the creation response contains all required fields and
 *    correct data types, including the UUID developer ID, email addresses,
 *    verification flag, and audit timestamps.
 *
 * The test implicitly verifies that developer creation requires admin
 * authentication and proper business rule enforcement such as email
 * uniqueness and correct password hash handling.
 */
export async function test_api_oauth_server_developers_creation_success_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Admin account creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // Step 2: Admin login to obtain fresh authorization
  const adminLoginAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLoginAuthorized);

  // Step 3: Create a new OAuth server developer with unique details
  const devEmail = typia.random<string & tags.Format<"email">>();
  const devPasswordHash = RandomGenerator.alphaNumeric(64);
  const developer: IOauthServerDeveloper =
    await api.functional.oauthServer.admin.oauthServerDevelopers.create(
      connection,
      {
        body: {
          email: devEmail,
          email_verified: true,
          password_hash: devPasswordHash,
        } satisfies IOauthServerDeveloper.ICreate,
      },
    );
  typia.assert(developer);

  // Step 4: Validate created developer entity fields
  TestValidator.predicate(
    "developer id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      developer.id,
    ),
  );
  TestValidator.equals(
    "developer email matches creation input",
    developer.email,
    devEmail,
  );
  TestValidator.equals(
    "developer email_verified flag is true",
    developer.email_verified,
    true,
  );
  TestValidator.equals(
    "developer password_hash matches input",
    developer.password_hash,
    devPasswordHash,
  );
  TestValidator.predicate(
    "developer created_at exists",
    typeof developer.created_at === "string" && developer.created_at.length > 0,
  );
  TestValidator.predicate(
    "developer updated_at exists",
    typeof developer.updated_at === "string" && developer.updated_at.length > 0,
  );
  TestValidator.predicate(
    "developer deleted_at is null or undefined",
    developer.deleted_at === null || developer.deleted_at === undefined,
  );
}
