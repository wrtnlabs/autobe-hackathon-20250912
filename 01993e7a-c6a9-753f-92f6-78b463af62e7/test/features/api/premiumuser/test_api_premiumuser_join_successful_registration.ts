import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Test the premium user registration functionality via POST
 * /auth/premiumUser/join. The scenario validates successful creation of a
 * premium user account with unique email, username, and hashed password,
 * and correct setting of premium_since timestamp. It ensures the
 * authorization response includes valid tokens and confirms that the user
 * can proceed to login and session management workflows.
 */
export async function test_api_premiumuser_join_successful_registration(
  connection: api.IConnection,
) {
  // Generate realistic input data for registration
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash = RandomGenerator.alphaNumeric(60); // Simulating a bcrypt hash
  const username = RandomGenerator.name();

  // Create request body satisfying IRecipeSharingPremiumUser.ICreate
  const requestBody = {
    email: email,
    password_hash: passwordHash,
    username: username,
  } satisfies IRecipeSharingPremiumUser.ICreate;

  // Call the join API
  const authorizedUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: requestBody,
    });

  // Validate the response structure using typia
  typia.assert(authorizedUser);

  // Business logic validations
  TestValidator.predicate(
    "id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );
  TestValidator.equals("email matches request", authorizedUser.email, email);
  TestValidator.equals(
    "username matches request",
    authorizedUser.username,
    username,
  );
  TestValidator.equals(
    "password_hash matches request",
    authorizedUser.password_hash,
    passwordHash,
  );
  TestValidator.predicate(
    "premium_since is ISO datetime",
    !!authorizedUser.premium_since &&
      typeof authorizedUser.premium_since === "string",
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    !!authorizedUser.created_at &&
      typeof authorizedUser.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    !!authorizedUser.updated_at &&
      typeof authorizedUser.updated_at === "string",
  );
  TestValidator.equals("deleted_at is null", authorizedUser.deleted_at, null);

  // Validate token presence and structure
  TestValidator.predicate(
    "token is defined",
    authorizedUser.token !== null && authorizedUser.token !== undefined,
  );
  typia.assert(authorizedUser.token);
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO datetime",
    !!authorizedUser.token.expired_at &&
      typeof authorizedUser.token.expired_at === "string",
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO datetime",
    !!authorizedUser.token.refreshable_until &&
      typeof authorizedUser.token.refreshable_until === "string",
  );
}
