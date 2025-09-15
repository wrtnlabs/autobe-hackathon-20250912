import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";

/**
 * Validate that a developer user can successfully refresh their JWT tokens.
 *
 * This test performs a full happy path flow for token refresh:
 *
 * 1. Registers a new developer user.
 * 2. Logs in the developer to acquire valid JWT access and refresh tokens.
 * 3. Calls the token refresh API with the valid refresh token.
 * 4. Validates that new access and refresh tokens are issued and differ from
 *    initial ones.
 *
 * This ensures the token refresh mechanism works correctly, maintaining
 * session continuity.
 */
export async function test_api_developer_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Register developer user
  const email: string = typia.random<string & tags.Format<"email">>();
  const passwordPlain = "StrongP@ssw0rd!";
  // Since API expects hashed password, simulate a hash (in test environment could be any string)
  const passwordHash = Buffer.from(passwordPlain).toString("base64");
  const name = RandomGenerator.name();

  const createBody = {
    email,
    password_hash: passwordHash,
    name,
  } satisfies ITaskManagementDeveloper.ICreate;

  const authorized: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Step 2: Login with developer credentials
  const loginBody = {
    email,
    password: passwordPlain,
  } satisfies ITaskManagementDeveloper.ILogin;

  const loginAuthorized: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // Validate login tokens
  TestValidator.predicate(
    "login provides access token string",
    typeof loginAuthorized.token.access === "string" &&
      loginAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "login provides refresh token string",
    typeof loginAuthorized.token.refresh === "string" &&
      loginAuthorized.token.refresh.length > 0,
  );

  // Step 3: Refresh token
  const refreshBody = {
    refresh_token: loginAuthorized.token.refresh,
  } satisfies ITaskManagementDeveloper.IRefresh;

  const refreshAuthorized: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshAuthorized);

  // Validate refresh token outputs
  TestValidator.predicate(
    "refresh provides new access token string",
    typeof refreshAuthorized.token.access === "string" &&
      refreshAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh provides new refresh token string",
    typeof refreshAuthorized.token.refresh === "string" &&
      refreshAuthorized.token.refresh.length > 0,
  );

  // Step 4: Tokens should differ
  TestValidator.notEquals(
    "new access token should differ from old",
    refreshAuthorized.token.access,
    loginAuthorized.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should differ from old",
    refreshAuthorized.token.refresh,
    loginAuthorized.token.refresh,
  );
}
