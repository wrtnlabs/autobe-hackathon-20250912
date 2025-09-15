import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignTeamLeader } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignTeamLeader";

/**
 * Validates successful login flow for a teamLeader user.
 *
 * This test ensures that after registering a new teamLeader user via the
 * join endpoint, a login attempt with the same credentials successfully
 * returns the expected user information and authentication tokens.
 *
 * Steps:
 *
 * 1. Register a teamLeader with randomized but valid credentials.
 * 2. Attempt login with the created user's email and known password.
 * 3. Assert that login response matches the created user's identity.
 * 4. Validate the presence and structure of JWT access and refresh tokens.
 *
 * This validates the system's correct handling of authentication including
 * JWT issuance and proper user information retrieval.
 */
export async function test_api_teamleader_login_successful_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new teamLeader user account
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    mobile_phone: null,
  } satisfies IEasySignTeamLeader.ICreate;

  const created: IEasySignTeamLeader.IAuthorized =
    await api.functional.auth.teamLeader.join(connection, { body: createBody });
  typia.assert(created);

  // 2. Login with the registered user's credentials
  const loginBody = {
    email: created.email,
    password: "1234",
  } satisfies IEasySignTeamLeader.ILogin;

  const loggedIn: IEasySignTeamLeader.IAuthorized =
    await api.functional.auth.teamLeader.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // 3. Validate user data consistency and token presence
  TestValidator.equals("user id matches after login", loggedIn.id, created.id);
  TestValidator.equals(
    "user email matches after login",
    loggedIn.email,
    created.email,
  );
  TestValidator.equals(
    "user name matches after login",
    loggedIn.name,
    created.name,
  );

  // 4. Validate token structure and timestamps
  typia.assert<IAuthorizationToken>(loggedIn.token);

  TestValidator.predicate(
    "access token is non-empty string",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time string",
    !!loggedIn.token.expired_at &&
      typeof loggedIn.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time string",
    !!loggedIn.token.refreshable_until &&
      typeof loggedIn.token.refreshable_until === "string",
  );
}
