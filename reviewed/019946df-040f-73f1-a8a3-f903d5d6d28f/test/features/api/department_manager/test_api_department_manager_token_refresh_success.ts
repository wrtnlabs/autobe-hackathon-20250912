import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * Test the token refresh functionality for department manager role
 * authorization.
 *
 * This test performs the following sequence:
 *
 * 1. Register a new department manager via join endpoint.
 * 2. Login as the department manager to obtain initial tokens.
 * 3. Use the refresh token to get new access and refresh tokens.
 * 4. Assert that the refreshed tokens are valid and different from the
 *    originals.
 * 5. Confirm that the new authorization state matches expected properties.
 *
 * This flow ensures that the token refresh process is working correctly,
 * preventing replay attacks by invalidating old tokens and allowing
 * seamless session continuation.
 */
export async function test_api_department_manager_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new department manager
  const joinBody = {
    email: `tokenrefresh_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const joinResult: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  typia.assert(joinResult);
  TestValidator.predicate(
    "join token.access is non-empty",
    typeof joinResult.token.access === "string" &&
      joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "join token.refresh is non-empty",
    typeof joinResult.token.refresh === "string" &&
      joinResult.token.refresh.length > 0,
  );

  // 2. Login as registered department manager
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loginResult: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // Token fields must be non-empty string
  TestValidator.predicate(
    "login token.access is non-empty",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh is non-empty",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );

  // 3. Use refresh token to get new tokens
  const refreshBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies IEnterpriseLmsDepartmentManager.IRefresh;

  const refreshResult: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResult);

  // Assert new tokens differ from login tokens
  TestValidator.notEquals(
    "refresh token.access differs from login token.access",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token.refresh differs from login token.refresh",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );

  // Assert refresh result user properties equal login result user properties
  TestValidator.equals(
    "refresh user id matches login user id",
    refreshResult.id,
    loginResult.id,
  );
  TestValidator.equals(
    "refresh user email matches login user email",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "refresh tenant id matches login tenant id",
    refreshResult.tenant_id,
    loginResult.tenant_id,
  );
  TestValidator.equals(
    "refresh user first name matches login user first name",
    refreshResult.first_name,
    loginResult.first_name,
  );
  TestValidator.equals(
    "refresh user last name matches login user last name",
    refreshResult.last_name,
    loginResult.last_name,
  );
  TestValidator.equals(
    "refresh user status matches login user status",
    refreshResult.status,
    loginResult.status,
  );

  // 4. Confirm that old refresh tokens cannot be reused (token replay attack prevention)
  await TestValidator.error(
    "reusing old refresh token should fail",
    async () => {
      await api.functional.auth.departmentManager.refresh(connection, {
        body: refreshBody,
      });
    },
  );
}
