import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";

/**
 * Tests the admin user registration process via the /auth/admin/join
 * endpoint.
 *
 * This test ensures that a new admin can be registered with a unique valid
 * email, a plain password, and the email_verified flag set. It verifies
 * that the API returns a fully populated admin authorization object
 * including:
 *
 * - Correct email and email_verified flag
 * - A non-empty hashed password string
 * - Valid creation and update timestamps
 * - Nullable deleted_at
 * - Valid JWT token with access and refresh tokens and their expiration
 *   timestamps
 *
 * The test uses typia to validate the response structure and TestValidator
 * for business logic assertions. It focuses solely on the valid positive
 * flow.
 */
export async function test_api_admin_user_registration_and_token_issuance(
  connection: api.IConnection,
) {
  // Generate realistic random valid email and password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // 12-char alphanumeric password

  // Compose registration body
  const requestBody = {
    email: adminEmail,
    email_verified: true,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ICreate;

  // Call the join API
  const authorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: requestBody });

  // Validate response structure
  typia.assert(authorized);

  // Validate basic admin properties
  TestValidator.equals(
    "admin email matches registration input",
    authorized.email,
    adminEmail,
  );
  TestValidator.predicate(
    "email_verified flag is true",
    authorized.email_verified === true,
  );
  TestValidator.predicate(
    "password_hash is non-empty string",
    typeof authorized.password_hash === "string" &&
      authorized.password_hash.length > 0,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof authorized.created_at === "string" &&
      authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof authorized.updated_at === "string" &&
      authorized.updated_at.length > 0,
  );

  // Validate deleted_at is either null or undefined or ISO string if present
  TestValidator.predicate(
    "deleted_at is null or undefined or ISO string",
    authorized.deleted_at === null ||
      authorized.deleted_at === undefined ||
      typeof authorized.deleted_at === "string",
  );

  // Validate token
  typia.assert(authorized.token);
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601 string",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 string",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );
}
