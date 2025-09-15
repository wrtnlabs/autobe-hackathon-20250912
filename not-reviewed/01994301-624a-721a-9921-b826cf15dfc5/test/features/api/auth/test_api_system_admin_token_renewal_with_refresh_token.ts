import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * JWT token refresh process for system administrators, including edge case
 * error handling.
 *
 * 1. Register new system admin (active)
 * 2. Login as admin to obtain tokens
 * 3. Refresh tokens using the given refresh token
 * 4. Validate the returned admin profile and token change (tokens should be new)
 * 5. Attempt refresh with a tampered/invalid refresh token — error expected
 * 6. Attempt refresh with a previously used (now old) refresh token — error
 *    expected
 * 7. Attempt refresh after deactivation/deletion — error expected (step omitted as
 *    no API is available)
 */
export async function test_api_system_admin_token_renewal_with_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register new admin (active)
  const password = RandomGenerator.alphaNumeric(12);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const createBody = {
    email: adminEmail,
    password,
    name: adminName,
    super_admin: false,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;

  const joined: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(joined);
  TestValidator.equals("created admin email", joined.email, adminEmail);
  TestValidator.equals("created admin name", joined.name, adminName);
  TestValidator.predicate("admin is active", joined.is_active === true);
  typia.assert(joined.token);

  // 2. Login as admin to obtain tokens (simulate session reset)
  const loginResult: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        password,
      } satisfies IAtsRecruitmentSystemAdmin.ILogin,
    });
  typia.assert(loginResult);
  TestValidator.equals("login admin email", loginResult.email, adminEmail);
  TestValidator.equals("login admin id", loginResult.id, joined.id);
  TestValidator.equals(
    "login admin super_admin",
    loginResult.super_admin,
    joined.super_admin,
  );

  // 3. Refresh token using valid refresh token
  const refreshToken = loginResult.token.refresh;
  const refreshResult: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IAtsRecruitmentSystemAdmin.IRefresh,
    });
  typia.assert(refreshResult);
  TestValidator.equals("refresh admin id", refreshResult.id, joined.id);
  TestValidator.notEquals(
    "old and new access token differ",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "old and new refresh token differ",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );

  // 4. Attempt refresh with tampered token
  await TestValidator.error("refresh with tampered token fails", async () => {
    await api.functional.auth.systemAdmin.refresh(connection, {
      body: {
        refresh_token: refreshToken + "tampered",
      } satisfies IAtsRecruitmentSystemAdmin.IRefresh,
    });
  });

  // 5. Attempt refresh with old (now used) refresh token again (should be invalid/rejected)
  await TestValidator.error(
    "second refresh with used token fails",
    async () => {
      await api.functional.auth.systemAdmin.refresh(connection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IAtsRecruitmentSystemAdmin.IRefresh,
      });
    },
  );

  // 6. Deactivate the admin account (simulate logical deletion)
  // (No direct API for this in test scope; if available, would call here)
  // This test is omitted since there is no provided API function for logical deletion.

  // 7. Edge: Attempt refresh with invalid format (totally bad token)
  await TestValidator.error(
    "refresh with totally invalid token fails",
    async () => {
      await api.functional.auth.systemAdmin.refresh(connection, {
        body: {
          refresh_token: "invalid-token",
        } satisfies IAtsRecruitmentSystemAdmin.IRefresh,
      });
    },
  );
}
