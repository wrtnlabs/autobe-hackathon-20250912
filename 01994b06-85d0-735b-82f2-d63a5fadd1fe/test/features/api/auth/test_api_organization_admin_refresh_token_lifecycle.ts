import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate the session refresh lifecycle for an organization admin login, token
 * refresh, replay, and error scenarios.
 *
 * 1. Onboard an organization admin (join)
 * 2. Login as org admin to receive valid token pair
 * 3. Use refresh token to successfully get new token pair (should rotate)
 * 4. Attempt refresh with an invalid token (expect error)
 * 5. Attempt a double refresh with the same token (should only work once)
 */
export async function test_api_organization_admin_refresh_token_lifecycle(
  connection: api.IConnection,
) {
  // 1. Signup: create a new organization admin and get initial tokens
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);
  const joinInput = {
    email,
    full_name,
    password,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const joined = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(joined);
  TestValidator.predicate("join returns token", Boolean(joined.token));
  TestValidator.notEquals(
    "token does not leak password",
    (joined as any).password,
    password,
  );

  // 2. Admin login (get new token pair)
  const loginInput = {
    email,
    password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginInput },
  );
  typia.assert(loginResult);
  TestValidator.equals("login email matches join", loginResult.email, email);
  TestValidator.notEquals(
    "login token differs from join token",
    loginResult.token.access,
    joined.token.access,
  );

  // 3. Use refresh token to get new tokens
  const refreshInput = {
    refresh_token: loginResult.token.refresh,
  } satisfies IHealthcarePlatformOrganizationAdmin.IRefresh;
  const refreshed = await api.functional.auth.organizationAdmin.refresh(
    connection,
    { body: refreshInput },
  );
  typia.assert(refreshed);
  TestValidator.equals("refresh admin id matches", refreshed.id, joined.id);
  TestValidator.notEquals(
    "refreshed access token rotates",
    refreshed.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token rotates",
    refreshed.token.refresh,
    loginResult.token.refresh,
  );

  // 4. Attempt refresh with an invalid token
  await TestValidator.error(
    "refresh with obviously bad token fails",
    async () => {
      await api.functional.auth.organizationAdmin.refresh(connection, {
        body: {
          refresh_token: "this_is_invalid",
        } satisfies IHealthcarePlatformOrganizationAdmin.IRefresh,
      });
    },
  );

  // 5. Attempt a double refresh with the same token (should fail)
  await TestValidator.error(
    "double refresh with same token fails",
    async () => {
      await api.functional.auth.organizationAdmin.refresh(connection, {
        body: refreshInput,
      });
    },
  );
}
