import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates refresh of JWT tokens for healthcare platform system admin with
 * valid and invalid (expired/revoked) refresh tokens.
 *
 * 1. Registers a new system admin (unique business email, provider: 'local', with
 *    password).
 * 2. Logs in as system admin to obtain valid authorization tokens.
 * 3. Performs refresh with valid refresh token (success path): asserts new tokens
 *    are issued and profile matches; no sensitive data exposed.
 * 4. Immediately tries to refresh again with same refresh token (simulate typical
 *    single-use/rotation or revoked scenario): expects failure; asserts no
 *    tokens are returned, and no credential hashes leak.
 * 5. Attempts refresh with forged/invalid refresh token: expects failure.
 * 6. Assures no confidential fields are exposed and only valid, active tokens
 *    allow a refresh.
 */
export async function test_api_system_admin_refresh_token_success_and_expiry(
  connection: api.IConnection,
) {
  // 1. Register a system admin with unique business email and password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const fullName = RandomGenerator.name();
  const joinBody = {
    email: adminEmail,
    full_name: fullName,
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: password,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const joinResp = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResp);
  TestValidator.equals("admin email matches", joinResp.email, adminEmail);
  TestValidator.equals(
    "admin provider token exists",
    typeof joinResp.token.access,
    "string",
  );
  TestValidator.equals(
    "no password hash leak in admin profile",
    (joinResp as any).password,
    undefined,
  );

  // 2. Login as admin to get tokens
  const loginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResp);
  TestValidator.equals("login email matches", loginResp.email, adminEmail);
  const refreshToken = loginResp.token.refresh;
  const originalAccessToken = loginResp.token.access;

  // 3. Successful refresh
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IHealthcarePlatformSystemAdmin.IRefresh;
  const refreshResp = await api.functional.auth.systemAdmin.refresh(
    connection,
    { body: refreshBody },
  );
  typia.assert(refreshResp);
  TestValidator.equals(
    "refreshed email matches",
    refreshResp.email,
    adminEmail,
  );
  TestValidator.notEquals(
    "new access token issued",
    refreshResp.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token issued",
    refreshResp.token.refresh,
    refreshToken,
  );
  TestValidator.equals(
    "no password hash leak on refresh",
    (refreshResp as any).password,
    undefined,
  );

  // 4. Reuse of the same refresh token (simulate expiry/revocation or single-use)
  await TestValidator.error(
    "refresh with already-used/expired token should fail",
    async () => {
      await api.functional.auth.systemAdmin.refresh(connection, {
        body: refreshBody,
      });
    },
  );

  // 5. Attempt refresh with a completely invalid/forged token
  await TestValidator.error(
    "refresh with forged/invalid token fails",
    async () => {
      await api.functional.auth.systemAdmin.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies IHealthcarePlatformSystemAdmin.IRefresh,
      });
    },
  );
}
