import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

export async function test_api_pm_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new PM user
  const email = `${RandomGenerator.alphabets(6)}@example.com`;
  const password = "validPassword123";
  const name = RandomGenerator.name();

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email,
        password,
        name,
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // 2. Login as the PM user
  const loginResult: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email,
        password,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(loginResult);

  // 3. Use the valid refresh token to obtain new tokens
  const refreshResult: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.refresh(connection, {
      body: {
        refresh_token: loginResult.token.refresh,
      } satisfies ITaskManagementPm.IRefresh,
    });
  typia.assert(refreshResult);

  // Validate that new tokens are different
  TestValidator.notEquals(
    "refresh token should change",
    loginResult.token.refresh,
    refreshResult.token.refresh,
  );
  TestValidator.notEquals(
    "access token should change",
    loginResult.token.access,
    refreshResult.token.access,
  );

  // 4. Test token refresh failure with invalid token
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.pm.refresh(connection, {
        body: {
          refresh_token: `invalidtoken-${RandomGenerator.alphabets(10)}`,
        } satisfies ITaskManagementPm.IRefresh,
      });
    },
  );
}
