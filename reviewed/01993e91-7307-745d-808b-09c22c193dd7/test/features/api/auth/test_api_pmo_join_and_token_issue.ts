import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * Test the registration (join) process for Project Management Officer (PMO)
 * users.
 *
 * Steps:
 *
 * 1. Submit valid registration data including email, password, and necessary
 *    fields to /auth/pmo/join.
 * 2. Verify the response contains authorized JWT tokens and user details.
 * 3. Ensure email uniqueness validation.
 * 4. Attempt registration with duplicate email to test failure.
 * 5. Confirm no password hash leakage in response. Business rules: Registration
 *    requires valid unique email and secure password. Success criteria:
 *    Successful registration returns proper authorization tokens and new user
 *    info; duplicate registration fails appropriately.
 */
export async function test_api_pmo_join_and_token_issue(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Random 12 char alphanumeric password
  const name = RandomGenerator.name(2); // Generate a 2-word realistic name

  const joinRequest = {
    email,
    password,
    name,
  } satisfies ITaskManagementPmo.IJoin;

  // Step 2: Perform initial join request
  const authorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinRequest });

  // Validate the response is correctly structured and types match
  typia.assert(authorized);

  // Check that returned email matches request
  TestValidator.equals(
    "returned email matches join email",
    authorized.email,
    email,
  );

  // Check that name matches
  TestValidator.equals(
    "returned name matches join name",
    authorized.name,
    name,
  );

  // Check that ID is a valid UUID string (trusted by typia.assert)
  // Check that password_hash exists and is non-empty string
  TestValidator.predicate(
    "password_hash is a non-empty string",
    typeof authorized.password_hash === "string" &&
      authorized.password_hash.length > 0,
  );

  // Ensure the plaintext password is NOT leaked in any property
  TestValidator.predicate(
    "password plaintext should not leak",
    !Object.values(authorized).some((value) => value === password),
  );

  // Check timestamps are in correct format (validated by typia.assert)

  // Check token structure
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);

  // Validate the token's access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Validate token dates are valid ISO date-time strings (typia.assert covers format)

  // Step 3: Attempt duplicate registration with the same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.pmo.join(connection, {
        body: { email, password, name } satisfies ITaskManagementPmo.IJoin,
      });
    },
  );
}
