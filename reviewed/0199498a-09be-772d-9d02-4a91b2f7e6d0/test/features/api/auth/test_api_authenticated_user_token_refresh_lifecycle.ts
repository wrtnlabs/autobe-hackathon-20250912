import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";

/**
 * Test the session refresh lifecycle for an authenticatedUser, ensuring that a
 * valid session and non-revoked refresh token are required to obtain a new
 * token. Scenario begins with user signup and login to obtain the necessary
 * session. Validate that the refresh endpoint returns a new session with
 * updated claims and tokens, and enforces that only active, non-revoked
 * sessions tied to active users (not soft deleted) are eligible. Simulate token
 * expiration, explicit revocation, or user deletion to validate negative/error
 * responses for refresh under these edge cases. Confirm audit trail for
 * successful and failed refresh attempts where possible within API limits.
 *
 * 1. Register a new authenticated user via join endpoint
 * 2. Login as that user to obtain session/access/refresh tokens
 * 3. Call refresh endpoint using that refresh token to get new tokens/session
 * 4. Validate that returned session is correct (claims, tokens)
 * 5. Simulate reusing old/consumed refresh token and expect error (if supported)
 * 6. Simulate explicit revocation, expiration, or user deletion to confirm failure
 *    (if supported)
 * 7. Confirm audit trail for refresh attempts if auditing is exposed (not
 *    currently testable)
 */
export async function test_api_authenticated_user_token_refresh_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register a new authenticated user
  const externalUserId: string = RandomGenerator.alphaNumeric(12);
  const userEmail: string = `${RandomGenerator.alphabets(8)}@test-refresh.com`;
  const join: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        external_user_id: externalUserId,
        email: userEmail,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    });
  typia.assert(join);

  // 2. Login with the just registered user
  const login: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.login(connection, {
      body: {
        external_user_id: externalUserId,
        email: userEmail,
      } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
    });
  typia.assert(login);

  // Validate token/claims between join and login
  TestValidator.equals(
    "Join and login issued for same user",
    join.id,
    login.id,
  );
  TestValidator.equals("Join and login email match", join.email, login.email);
  TestValidator.equals(
    "Join and login external IDs match",
    join.external_user_id,
    login.external_user_id,
  );

  // 3. Call refresh endpoint with the refresh token from login
  // The API SDK sets connection.headers.Authorization automatically, so prior call's token is active session
  const refresh1: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.refresh(connection, {
      body: {},
    });
  typia.assert(refresh1);

  // Validate new session returned, proper structure and token update
  TestValidator.equals("Refresh user id matches login", refresh1.id, login.id);
  TestValidator.equals(
    "Refresh user email matches login",
    refresh1.email,
    login.email,
  );
  TestValidator.notEquals(
    "Access token after refresh differs from original login",
    refresh1.token.access,
    login.token.access,
  );
  TestValidator.notEquals(
    "Refresh token after refresh differs from original login",
    refresh1.token.refresh,
    login.token.refresh,
  );

  // 4. Attempt to call refresh again immediately (simulate fast replay, if backend allows)
  const refresh2: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.refresh(connection, {
      body: {},
    });
  typia.assert(refresh2);
  TestValidator.notEquals(
    "Multiple sequential refreshes yield new tokens",
    refresh2.token.access,
    refresh1.token.access,
  );
  TestValidator.notEquals(
    "Multiple sequential refreshes yield new refresh tokens",
    refresh2.token.refresh,
    refresh1.token.refresh,
  );

  // 5. Attempt to refresh after disconnecting session (simulate invalidation). No explicit API to revoke so cannot test true revocation, but can create a new connection without token and expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Cannot refresh without Authorization header (unauthenticated attempt)",
    async () => {
      await api.functional.auth.authenticatedUser.refresh(unauthConn, {
        body: {},
      });
    },
  );
}
