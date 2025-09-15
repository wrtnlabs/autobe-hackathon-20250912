import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";

/**
 * Test the successful registration of a Telegram File Downloader end user via
 * the /auth/endUser/join endpoint. Validates account creation with a unique
 * email and hashed password, issuance of initial JWT tokens for authentication,
 * and proper rejection of duplicate email registrations.
 *
 * Workflow:
 *
 * 1. Register a new user with a unique email and password hash.
 * 2. Confirm the response contains authorized user info with tokens.
 * 3. Confirm returned email matches request.
 * 4. Verify tokens are present and well-formed.
 * 5. Attempt duplicate registration and expect failure.
 */
export async function test_api_enduser_join_successful_registration_and_token_issuance(
  connection: api.IConnection,
) {
  // Step 1: Generate a unique legitimate email and a random hashed password
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash: string = RandomGenerator.alphaNumeric(20);

  // Request body for registration
  const createBody = {
    email: email,
    password_hash: passwordHash,
  } satisfies ITelegramFileDownloaderEndUser.ICreate;

  // Step 2: Call the join endpoint to register new user
  const authorizedUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: createBody,
    });

  // Step 3: Assert the returned user data
  typia.assert(authorizedUser);

  // Step 4: Validate that email matches
  TestValidator.equals(
    "Returned user email should match requested email",
    authorizedUser.email,
    email,
  );

  // Step 5: Validate token presence and structure
  TestValidator.predicate(
    "Token access token should be a non-empty string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "Token refresh token should be a non-empty string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expired_at should be a valid date-time string",
    typeof authorizedUser.token.expired_at === "string" &&
      authorizedUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Token refreshable_until should be a valid date-time string",
    typeof authorizedUser.token.refreshable_until === "string" &&
      authorizedUser.token.refreshable_until.length > 0,
  );

  // Step 6: Attempt duplicate registration with same email and expect failure
  await TestValidator.error(
    "Duplicate email registration should fail",
    async () => {
      await api.functional.auth.endUser.join(connection, {
        body: createBody,
      });
    },
  );
}
