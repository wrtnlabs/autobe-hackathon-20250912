import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Validates the department head JWT token refresh workflow.
 *
 * - Registers a department head using join endpoint.
 * - Logs in as that department head, obtaining valid access and refresh tokens.
 * - Performs a successful token refresh with the issued refresh token.
 * - Verifies token bundle is new and valid, and session can continue.
 * - Attempts refresh with an invalid/garbage token; checks that no tokens are
 *   granted and error is raised.
 *
 * Steps:
 *
 * 1. Register department head and get authorized profile (with valid token).
 * 2. Login with those credentials for a fresh token set (access, refresh).
 * 3. Call refresh endpoint with the valid refresh token, expect success.
 * 4. Ensure the new tokens are different (at least refresh should change).
 * 5. Call refresh with known-invalid/garbage token, expect error.
 */
export async function test_api_department_head_token_refresh_flow(
  connection: api.IConnection,
) {
  // 1. Register a department head
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;

  const joined = await api.functional.auth.departmentHead.join(connection, {
    body: joinData,
  });
  typia.assert(joined);
  TestValidator.equals(
    "registered department head email matches",
    joined.email,
    joinData.email,
  );

  // 2. Login as department head
  const loginData = {
    email: joinData.email,
    password: joinData.password,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loggedIn = await api.functional.auth.departmentHead.login(connection, {
    body: loginData,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login department head id matches join",
    loggedIn.id,
    joined.id,
  );

  // 3. Refresh token with valid refresh token
  const refreshReq: IHealthcarePlatformDepartmentHead.IRefreshRequest = {
    refresh_token: loggedIn.token.refresh,
  };
  const refreshed = await api.functional.auth.departmentHead.refresh(
    connection,
    { body: refreshReq },
  );
  typia.assert(refreshed);
  TestValidator.notEquals(
    "new access token after refresh should differ from old",
    refreshed.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "new refresh token after refresh should differ from old",
    refreshed.token.refresh,
    loggedIn.token.refresh,
  );
  TestValidator.equals(
    "refreshed user id matches department head id",
    refreshed.id,
    joined.id,
  );

  // 4. Attempt refresh with invalid/garbage refresh token
  const invalidRefreshReq: IHealthcarePlatformDepartmentHead.IRefreshRequest = {
    refresh_token: RandomGenerator.alphaNumeric(80),
  };
  await TestValidator.error(
    "token refresh with invalid token should fail",
    async () => {
      await api.functional.auth.departmentHead.refresh(connection, {
        body: invalidRefreshReq,
      });
    },
  );
}
