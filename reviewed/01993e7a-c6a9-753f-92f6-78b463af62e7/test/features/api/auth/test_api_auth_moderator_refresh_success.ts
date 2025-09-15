import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * This scenario tests the successful JWT token refresh workflow for a moderator
 * user using the recipe sharing backend API. The test first creates a new
 * moderator user by calling the join endpoint with valid credentials (email,
 * password_hash, username). Then, it performs a login operation using the
 * created user's email and password_hash to obtain initial authorization tokens
 * (access and refresh tokens). Finally, it invokes the refresh endpoint with a
 * valid refresh token obtained from login to acquire a new set of JWT tokens,
 * ensuring the refresh process works as intended. All API responses are
 * validated with typia.assert to confirm schema compliance. The test utilizes
 * the official API authentication endpoints: join, login, and refresh for
 * moderators. This comprehensive test ensures the token refresh mechanism
 * maintains session continuity and security for moderator role authorization.
 */
export async function test_api_auth_moderator_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Generate random data for moderator creation
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64), // Simulate 64-character hash
    username: RandomGenerator.name(2).replace(/\s+/g, "_"), // username no spaces
  } satisfies IRecipeSharingModerator.ICreate;

  // Step 2: Call join API to create moderator
  const joined: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(joined);

  // Step 3: Assemble login body using created credentials
  const loginBody = {
    email: joined.email,
    password_hash: createBody.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;

  // Step 4: Call login API
  const loggedIn: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Step 5: Prepare refresh token payload
  const refreshBody = {
    refresh_token: loggedIn.token.refresh,
  } satisfies IRecipeSharingModerator.IRefresh;

  // Step 6: Refresh tokens using refresh API
  const refreshed: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Step 7: Validate token continuity and renewal
  TestValidator.predicate(
    "Refresh token is a non-empty string",
    typeof refreshBody.refresh_token === "string" &&
      refreshBody.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "New access token is a string",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "New refresh token is a string",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  // (Optional) Ensure new tokens differ from previous tokens to confirm renewal
  TestValidator.notEquals(
    "Access token should update after refresh",
    loggedIn.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "Refresh token should update after refresh",
    loggedIn.token.refresh,
    refreshed.token.refresh,
  );
}
