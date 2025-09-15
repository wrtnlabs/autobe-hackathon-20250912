import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";

/**
 * Validates the login operation for an already-registered authenticated user
 * using external_user_id and email.
 *
 * 1. Registers a new authenticatedUser with unique external_user_id and email.
 * 2. Performs login with correct credentials, validates issued session token, and
 *    ensures token is bound to the user.
 * 3. Verifies business logic by attempting login with unregistered/malformed
 *    credentials (no type error tests).
 * 4. Confirms no session tokens are issued and appropriate errors are returned for
 *    invalid login attempts.
 *
 * (Soft-deleted account scenario is not implemented as no such API is
 * available.)
 */
export async function test_api_authenticated_user_login_session_issuance(
  connection: api.IConnection,
) {
  // 1. Register an authenticated user
  const external_user_id = RandomGenerator.alphaNumeric(12);
  const email = `${RandomGenerator.alphabets(8)}@business-domain.com`;
  const createBody = {
    external_user_id,
    email,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const registeredUser = await api.functional.auth.authenticatedUser.join(
    connection,
    { body: createBody },
  );
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered external_user_id matches",
    registeredUser.external_user_id,
    external_user_id,
  );
  TestValidator.equals("registered email matches", registeredUser.email, email);
  TestValidator.equals(
    "registered actor_type is 'authenticatedUser'",
    registeredUser.actor_type,
    "authenticatedUser",
  );
  TestValidator.predicate(
    "token is present on registration",
    typeof registeredUser.token.access === "string" &&
      registeredUser.token.access.length > 10,
  );
  // 2. Login with the same external_user_id and email
  const loginBody = {
    external_user_id,
    email,
  } satisfies IStoryfieldAiAuthenticatedUser.ILogin;
  const loginResult = await api.functional.auth.authenticatedUser.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginResult);
  TestValidator.equals(
    "login external_user_id matches",
    loginResult.external_user_id,
    registeredUser.external_user_id,
  );
  TestValidator.equals(
    "login email matches",
    loginResult.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "login actor_type is 'authenticatedUser'",
    loginResult.actor_type,
    "authenticatedUser",
  );
  TestValidator.predicate(
    "login token is present",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 10,
  );
  TestValidator.notEquals(
    "login issued new access token",
    loginResult.token.access,
    registeredUser.token.access,
  );
  // 3. Attempt login with unregistered (random) credentials
  const badLoginBody = {
    external_user_id: RandomGenerator.alphaNumeric(12),
    email: `notexisting_${RandomGenerator.alphabets(6)}@biz.com`,
  } satisfies IStoryfieldAiAuthenticatedUser.ILogin;
  await TestValidator.error("login with unregistered user fails", async () => {
    await api.functional.auth.authenticatedUser.login(connection, {
      body: badLoginBody,
    });
  });
  // Note: Type error/missing-field tests are intentionally omitted because those scenarios are not permitted by TypeScript and are forbidden.
  // Soft-deletion business error not implemented due to lack of such API.
}
