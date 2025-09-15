import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignFreelancerUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignFreelancerUser";

/**
 * Test the refresh token mechanism for freelancer users.
 *
 * This test performs end-to-end validation of the
 * /auth/freelancerUser/refresh endpoint. It includes authentication using a
 * valid existing freelancer user to obtain initial tokens, then performs
 * multiple refresh operations with valid refresh tokens, verifying new
 * tokens are properly issued. It also confirms error handling by attempting
 * refresh with invalid tokens.
 *
 * Steps:
 *
 * 1. Authenticate an existing freelancer user to retrieve access and refresh
 *    tokens.
 * 2. Verify the returned authorization data is structurally valid.
 * 3. Use the refresh token to obtain new tokens and confirm validity.
 * 4. Repeat refresh with the new token to ensure continuous session
 *    management.
 * 5. Attempt refresh with invalid tokens and confirm errors are thrown as
 *    expected.
 *
 * This flow ensures token lifecycle is managed securely and the refresh
 * mechanism behaves as intended.
 */
export async function test_api_freelancer_user_token_refresh_mechanism(
  connection: api.IConnection,
) {
  // 1. Use login dependency to authenticate a known valid freelancer user and get initial tokens
  // We'll create a valid login body for this purpose
  const validLoginBody = typia.random<IEasySignFreelancerUser.ILogin>();

  // Authenticate user
  const loginResult = await api.functional.auth.freelancerUser.login(
    connection,
    {
      body: validLoginBody,
    },
  );

  // Validate login result
  typia.assert(loginResult);

  // Extract initial refresh token
  const initialRefreshToken = loginResult.token.refresh;

  // Function to request token refresh
  async function refreshToken(refreshToken: string) {
    const response = await api.functional.auth.freelancerUser.refresh(
      connection,
      {
        body: {
          refresh_token: refreshToken,
        } satisfies IEasySignFreelancerUser.IRefresh,
      },
    );
    typia.assert(response);
    return response;
  }

  // 2. Use initial refresh token to get new tokens
  const refreshResponse1 = await refreshToken(initialRefreshToken);

  // Check that tokens are non-empty strings
  TestValidator.predicate(
    "new access token is non-empty string",
    typeof refreshResponse1.token.access === "string" &&
      refreshResponse1.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty string",
    typeof refreshResponse1.token.refresh === "string" &&
      refreshResponse1.token.refresh.length > 0,
  );

  // 3. Refresh again using the new refresh token
  const refreshResponse2 = await refreshToken(refreshResponse1.token.refresh);

  TestValidator.predicate(
    "2nd refresh access token is non-empty string",
    typeof refreshResponse2.token.access === "string" &&
      refreshResponse2.token.access.length > 0,
  );
  TestValidator.predicate(
    "2nd refresh refresh token is non-empty string",
    typeof refreshResponse2.token.refresh === "string" &&
      refreshResponse2.token.refresh.length > 0,
  );

  // 4. Error test: try refreshing with an invalid token
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await refreshToken("invalid.token.value");
    },
  );

  // 5. Error test: try refreshing with empty string as token
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await refreshToken("");
    },
  );
}
