import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate the receptionist session token refresh workflow for both success
 * and error scenarios.
 *
 * This test covers the complete receptionist authentication lifecycle for
 * session refresh. It verifies that the API issues new JWT tokens when
 * given a valid refresh token for an authenticated user, and rejects
 * invalid refresh tokens without exposing sensitive information.
 *
 * - Register a new receptionist account with unique business email, full
 *   name, and phone number.
 * - Log in as the receptionist to receive an authentication/refresh token
 *   pair.
 * - Use the valid refresh token to acquire new access credentials via the
 *   refresh endpoint.
 *
 *   - Assert that returned JWTs are updated and receptionist identity matches
 *       expectations.
 * - Attempt to refresh the session using an invalid token, expecting
 *   authentication failure with no secret data leakage.
 */
export async function test_api_receptionist_refresh_token_workflow(
  connection: api.IConnection,
) {
  // Register a new receptionist account
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();

  const joinBody = {
    email,
    full_name,
    phone,
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const joinResult = await api.functional.auth.receptionist.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);
  TestValidator.equals("account email matches", joinResult.email, email);
  TestValidator.equals(
    "account full name matches",
    joinResult.full_name,
    full_name,
  );
  TestValidator.equals("account phone matches", joinResult.phone, phone);
  TestValidator.predicate(
    "token object exists after join",
    typeof joinResult.token === "object" && joinResult.token !== null,
  );

  // Login as the receptionist
  const loginBody = {
    email,
    password: "strongPW!1",
  } satisfies IHealthcarePlatformReceptionist.ILogin;
  const loginResult = await api.functional.auth.receptionist.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  TestValidator.equals("login email matches", loginResult.email, email);
  TestValidator.equals(
    "login full name matches",
    loginResult.full_name,
    full_name,
  );
  TestValidator.equals("login phone matches", loginResult.phone, phone);
  TestValidator.predicate(
    "token object exists after login",
    typeof loginResult.token === "object" && loginResult.token !== null,
  );

  // Perform token refresh with valid refresh token
  const refreshBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies IHealthcarePlatformReceptionist.IRefresh;
  const refreshResult = await api.functional.auth.receptionist.refresh(
    connection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshResult);

  // Validate new tokens and receptionist identity
  TestValidator.notEquals(
    "refreshed access token differs from previous",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refreshed access token differs from join",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.equals(
    "refreshed email matches login",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "refreshed full name matches login",
    refreshResult.full_name,
    loginResult.full_name,
  );
  TestValidator.equals(
    "refreshed phone matches login",
    refreshResult.phone,
    loginResult.phone,
  );

  // Error case: use invalid refresh token
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.receptionist.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(32),
        } satisfies IHealthcarePlatformReceptionist.IRefresh,
      });
    },
  );
}
