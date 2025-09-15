import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Comprehensive test of system administrator login API for success and failure
 * cases.
 *
 * 1. Register a new system admin with unique business email and password ("local"
 *    provider).
 * 2. Verify successful login with the correct credentials returns valid
 *    token/session (typia.assert, TestValidator on fields, tokens).
 * 3. Check login failure with wrong password (must NOT issue token/session, error
 *    is thrown).
 * 4. Check login failure for a non-existent email (business format, never
 *    registered; error is thrown).
 * 5. (Doc only) If API supported user deactivation/deletion, would also check
 *    login block for such user, but no such public API is exposed.
 *
 * All random business emails are generated per session. No type errors tested,
 * all data follows business and DTO constraints exactly.
 */
export async function test_api_system_admin_login_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const fullName: string = RandomGenerator.name();
  const provider: string = "local";
  const provider_key: string = adminEmail;
  const joinBody = {
    email: adminEmail,
    full_name: fullName,
    provider,
    provider_key,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const joinResult: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(joinResult);
  TestValidator.equals("admin email matches", joinResult.email, adminEmail);
  TestValidator.equals(
    "admin full_name matches",
    joinResult.full_name,
    fullName,
  );

  // 2. Success: correct login
  const loginBody = {
    email: adminEmail,
    provider,
    provider_key,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResult: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);
  TestValidator.equals(
    "login admin id matches join",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.predicate(
    "access token in login result",
    typeof loginResult.token?.access === "string" &&
      loginResult.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh token in login result",
    typeof loginResult.token?.refresh === "string" &&
      loginResult.token.refresh.length > 10,
  );

  // 3. Fail: wrong password
  const badPasswordBody = {
    email: adminEmail,
    provider,
    provider_key,
    password: RandomGenerator.alphaNumeric(20),
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.systemAdmin.login(connection, {
        body: badPasswordBody,
      });
    },
  );

  // 4. Fail: non-existent email
  const nonexistentLoginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    provider,
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  await TestValidator.error(
    "login with unregistered email should fail",
    async () => {
      await api.functional.auth.systemAdmin.login(connection, {
        body: nonexistentLoginBody,
      });
    },
  );
  // 5. (Optional) Fail: deleted/inactive user (not supported unless there is an API)
  // Not implemented since there is no API to mark account as deleted or inactive.
}
