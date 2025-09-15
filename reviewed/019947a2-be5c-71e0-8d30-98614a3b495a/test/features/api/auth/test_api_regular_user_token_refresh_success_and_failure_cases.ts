import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Test the regular Snapchat user token refresh lifecycle.
 *
 * This test creates a new Snapchat regular user account, logs in using the
 * unique social login ID to obtain valid JWT tokens, and tests the refresh
 * endpoint with a valid refresh token. It asserts success of token refresh
 * and validates the returned authorized user data.
 *
 * Negative test cases verify proper error handling by attempting refresh
 * calls with empty, malformed, or invalid refresh tokens, expecting errors
 * to be thrown.
 *
 * The SDK manages authentication tokens automatically. This test ensures
 * secure and robust session continuation via token refresh, validating both
 * successful and failure scenarios.
 */
export async function test_api_regular_user_token_refresh_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Create a new regular user with unique Snapchat social login ID and nickname
  const socialLoginId = `snapchat_${RandomGenerator.alphaNumeric(12)}`;
  const nickname = RandomGenerator.name();
  const createdUser = await api.functional.auth.regularUser.join(connection, {
    body: {
      social_login_id: socialLoginId,
      nickname: nickname,
      profile_image_uri: null,
    } satisfies IChatAppRegularUser.ICreate,
  });
  typia.assert(createdUser);

  // Validate created user properties
  TestValidator.predicate(
    "created user has UUID id",
    typeof createdUser.id === "string" && createdUser.id.length > 0,
  );
  TestValidator.equals(
    "created user social_login_id matches",
    createdUser.social_login_id,
    socialLoginId,
  );
  TestValidator.equals(
    "created user nickname matches",
    createdUser.nickname,
    nickname,
  );

  // 2. Login as the created user to obtain initial tokens
  const loggedInUser = await api.functional.auth.regularUser.login(connection, {
    body: {
      social_login_id: socialLoginId,
    } satisfies IChatAppRegularUser.IRequestLogin,
  });
  typia.assert(loggedInUser);

  TestValidator.equals(
    "login user id matches created user",
    loggedInUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "login user social_login_id matches",
    loggedInUser.social_login_id,
    socialLoginId,
  );

  // 3. Perform token refresh with valid refresh token
  const refreshedUser = await api.functional.auth.regularUser.refresh(
    connection,
    {
      body: {
        refresh_token: loggedInUser.token.refresh,
      } satisfies IChatAppRegularUser.IRequestRefresh,
    },
  );
  typia.assert(refreshedUser);

  TestValidator.equals(
    "refresh user id matches created user",
    refreshedUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "refresh user social_login_id matches",
    refreshedUser.social_login_id,
    socialLoginId,
  );

  // 4. Negative test cases for refresh token errors
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.regularUser.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IChatAppRegularUser.IRequestRefresh,
      });
    },
  );

  await TestValidator.error(
    "refresh with malformed token should fail",
    async () => {
      await api.functional.auth.regularUser.refresh(connection, {
        body: {
          refresh_token: "malformed.token.value",
        } satisfies IChatAppRegularUser.IRequestRefresh,
      });
    },
  );

  // Note: The test assumes the backend rejects revoked or expired tokens as well.
  await TestValidator.error(
    "refresh with invalid fake token should fail",
    async () => {
      await api.functional.auth.regularUser.refresh(connection, {
        body: {
          refresh_token: "invalid-refresh-token-1234567890",
        } satisfies IChatAppRegularUser.IRequestRefresh,
      });
    },
  );
}
