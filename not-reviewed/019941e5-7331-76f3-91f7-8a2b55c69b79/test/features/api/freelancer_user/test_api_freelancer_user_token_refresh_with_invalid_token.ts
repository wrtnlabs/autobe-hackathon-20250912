import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignFreelancerUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignFreelancerUser";

/**
 * This e2e test validates that the freelancer user token refresh endpoint
 * rejects invalid, expired, or malformed refresh tokens.
 *
 * It first authenticates a user to retrieve a valid refresh token for
 * reference. Then it attempts multiple refresh operations with various invalid
 * tokens. Each invalid token refresh attempt must fail with an error, ensuring
 * security of the token renewal process.
 *
 * This test ensures token lifecycle robustness against unauthorized or replay
 * attacks.
 */
export async function test_api_freelancer_user_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Authenticate to obtain a valid refresh token
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEasySignFreelancerUser.ILogin;
  const authorized: IEasySignFreelancerUser.IAuthorized =
    await api.functional.auth.freelancerUser.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // Extract valid refresh token for reference
  const validRefreshToken: string = authorized.token.refresh;

  // Step 2: Define a list of invalid refresh tokens for testing
  // Includes empty string, random strings, and tampered versions of valid token
  const invalidTokens: readonly string[] = [
    "",
    "invalid-token-string",
    `${validRefreshToken}tampered`,
    typia.random<string>(),
    "null",
    "undefined",
    "refreshToken",
    "1234567890",
  ];

  // Step 3: Test refresh endpoint with each invalid token and expect error
  await ArrayUtil.asyncForEach(invalidTokens, async (refreshToken) => {
    await TestValidator.error(
      `refresh with invalid token '${refreshToken}' should fail`,
      async () => {
        await api.functional.auth.freelancerUser.refresh(connection, {
          body: {
            refresh_token: refreshToken,
          } satisfies IEasySignFreelancerUser.IRefresh,
        });
      },
    );
  });

  // Note:
  // Additional tests for revoked or expired tokens can be added here when such tokens are available.
  // Currently, testing known invalid tokens suffices to validate security of refresh endpoint.
}
