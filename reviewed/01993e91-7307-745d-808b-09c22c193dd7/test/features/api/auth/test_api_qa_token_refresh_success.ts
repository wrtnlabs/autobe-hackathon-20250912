import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * This E2E test validates the successful JWT token refresh workflow for QA
 * users. The test covers user registration (/auth/qa/join), login
 * (/auth/qa/login), and token refresh (/auth/qa/refresh). It asserts valid
 * tokens are received at each stage and tests error handling for invalid
 * refresh tokens.
 *
 * Workflow:
 *
 * 1. Register a new QA user with email, hashed password, and name.
 * 2. Login with email and password to obtain initial tokens.
 * 3. Refresh tokens with the valid refresh token obtained from login.
 * 4. Assert new tokens differ from the old ones and are valid.
 * 5. Attempt refresh with an invalid token and expect an error.
 *
 * This test ensures the token lifecycle and security mechanisms for QA
 * authentication function correctly.
 */
export async function test_api_qa_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Prepare QA user data for registration
  const email: string & tags.Format<"email"> =
    `qa.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password: string = RandomGenerator.alphaNumeric(16);
  // NOTE: Using the plain password as password_hash for testing purposes
  const password_hash: string = password;
  const name: string = RandomGenerator.name();

  // 2. Register QA user using /auth/qa/join
  const authorizedJoin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email,
        password_hash,
        name,
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(authorizedJoin);

  // 3. Login QA user using /auth/qa/login
  const authorizedLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: {
        email,
        password,
      } satisfies ITaskManagementQa.ILogin,
    });
  typia.assert(authorizedLogin);

  // Assert refresh token and access token exist
  TestValidator.predicate(
    "refresh token exists after login",
    authorizedLogin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token exists after login",
    authorizedLogin.token.access.length > 0,
  );

  // Save prior tokens
  const prevRefreshToken: string = authorizedLogin.token.refresh;
  const prevAccessToken: string = authorizedLogin.token.access;

  // 4. Refresh tokens using /auth/qa/refresh
  const authorizedRefresh: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.refresh(connection, {
      body: {
        refresh_token: prevRefreshToken,
      } satisfies ITaskManagementQa.IRefresh,
    });
  typia.assert(authorizedRefresh);

  // Assert that new tokens exist and differ from previous tokens
  TestValidator.predicate(
    "new refresh token returned on refresh",
    authorizedRefresh.token.refresh.length > 0 &&
      authorizedRefresh.token.refresh !== prevRefreshToken,
  );
  TestValidator.predicate(
    "new access token returned on refresh",
    authorizedRefresh.token.access.length > 0 &&
      authorizedRefresh.token.access !== prevAccessToken,
  );

  // 5. Attempt refresh with invalid refresh token and expect error
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.qa.refresh(connection, {
        body: {
          refresh_token: "invalid_refresh_token",
        } satisfies ITaskManagementQa.IRefresh,
      });
    },
  );
}
