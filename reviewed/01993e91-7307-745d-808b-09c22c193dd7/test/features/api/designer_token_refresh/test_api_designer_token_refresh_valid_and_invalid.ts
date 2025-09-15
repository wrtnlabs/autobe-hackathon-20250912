import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Test the Designer user registration, login, and token refresh workflows.
 *
 * This test performs the complete token refresh workflow for Designer users
 * as follows:
 *
 * 1. Register a new Designer user via /auth/designer/join.
 * 2. Login with the registered Designer using /auth/designer/login to get
 *    initial tokens.
 * 3. Use the valid refresh token to request new JWT tokens through
 *    /auth/designer/refresh.
 * 4. Validate the returned tokens and authorization object.
 * 5. Attempt refreshing token with an invalid refresh token to confirm
 *    expected failure.
 *
 * This scenario covers the secure and correct refresh token lifecycle and
 * ensures the API rejects invalid refresh tokens.
 */
export async function test_api_designer_token_refresh_valid_and_invalid(
  connection: api.IConnection,
) {
  // Step 1: Register a new Designer user
  const fixedPassword = "password1234";

  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: fixedPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const authorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Step 2: Login the newly registered Designer user to get tokens
  const loginBody = {
    email: createBody.email,
    password: fixedPassword,
  } satisfies ITaskManagementDesigner.ILogin;

  const loginAuthorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  TestValidator.equals(
    "login email should equal registration email",
    loginAuthorized.email,
    createBody.email,
  );

  // Step 3: Use the refresh token to get new tokens
  const refreshBody = {
    refreshToken: loginAuthorized.token.refresh,
  } satisfies ITaskManagementDesigner.IRefresh;

  const refreshAuthorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshAuthorized);

  TestValidator.predicate(
    "access token should differ between login and refresh",
    refreshAuthorized.token.access !== loginAuthorized.token.access,
  );

  TestValidator.predicate(
    "refresh token should differ between login and refresh",
    refreshAuthorized.token.refresh !== loginAuthorized.token.refresh,
  );

  // Step 4: Attempt using an invalid refresh token and expect an error
  const invalidRefreshBody = {
    refreshToken: RandomGenerator.alphaNumeric(64),
  } satisfies ITaskManagementDesigner.IRefresh;

  await TestValidator.error(
    "refresh token with invalid token should fail",
    async () => {
      await api.functional.auth.designer.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
