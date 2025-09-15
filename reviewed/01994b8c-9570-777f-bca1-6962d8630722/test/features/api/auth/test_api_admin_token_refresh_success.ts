import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianAdmin";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  // Generate a realistic admin email and password hash
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(64); // simulate hashed password

  const joinRequestBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
  } satisfies ISubscriptionRenewalGuardianAdmin.ICreate;

  const joinedAdmin: ISubscriptionRenewalGuardianAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinRequestBody });
  typia.assert(joinedAdmin);

  TestValidator.equals(
    "joined admin email matches",
    joinedAdmin.email,
    adminEmail,
  );

  // 2. Admin login with same credentials
  const loginRequestBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
  } satisfies ISubscriptionRenewalGuardianAdmin.ILogin;

  const loginResult: ISubscriptionRenewalGuardianAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginRequestBody,
    });
  typia.assert(loginResult);

  TestValidator.equals(
    "login matches joined admin id",
    loginResult.id,
    joinedAdmin.id,
  );

  // 3. Use refresh token to get new tokens
  const refreshRequestBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies ISubscriptionRenewalGuardianAdmin.IRefresh;

  const refreshResult: ISubscriptionRenewalGuardianAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(refreshResult);

  // Confirm refreshed token access differs from old login token access
  TestValidator.notEquals(
    "refresh token access differs from login token access",
    refreshResult.token.access,
    loginResult.token.access,
  );

  // Confirm refresh token refresh differs from old login token refresh
  TestValidator.notEquals(
    "refresh token refresh differs from login token refresh",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );

  TestValidator.equals(
    "refreshed admin id matches",
    refreshResult.id,
    joinedAdmin.id,
  );

  // 4. Negative test - invalid refresh token error
  await TestValidator.error(
    "refresh fails with invalid refresh token",
    async () => {
      const invalidRefreshRequest = {
        refresh_token: "this.is.an.invalid.refresh.token",
      } satisfies ISubscriptionRenewalGuardianAdmin.IRefresh;

      await api.functional.auth.admin.refresh(connection, {
        body: invalidRefreshRequest,
      });
    },
  );
}
