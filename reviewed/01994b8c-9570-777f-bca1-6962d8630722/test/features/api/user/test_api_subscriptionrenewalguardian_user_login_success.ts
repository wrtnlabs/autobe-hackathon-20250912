import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";

/**
 * Test the successful login flow for a user in the Subscription Renewal
 * Guardian system.
 *
 * This test simulates user registration via the /auth/user/join endpoint,
 * then uses the same credentials to log in through /auth/user/login. It
 * verifies that the authenticated user object returned contains matching
 * ids and emails, and that valid JWT tokens are issued. The test asserts
 * correct response types and validates token expiration timestamps as ISO
 * 8601 date-time strings.
 *
 * Steps:
 *
 * 1. Prepare a user registration payload with realistic email and
 *    password_hash.
 * 2. Register the user through /auth/user/join.
 * 3. Prepare login credentials matching the registered user.
 * 4. Log in via /auth/user/login.
 * 5. Assert that the user properties match.
 * 6. Confirm that JWT tokens are issued with valid string contents.
 * 7. Verify expiration timestamps in the token are correctly formatted.
 */
export async function test_api_subscriptionrenewalguardian_user_login_success(
  connection: api.IConnection,
) {
  // 1. Prepare user registration data with realistic random email and password_hash
  const createUserBody = {
    email: typia.random<string>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;

  // 2. Register the user using /auth/user/join endpoint
  const createdUser: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: createUserBody });
  typia.assert(createdUser);

  // 3. Prepare login body with the same credentials
  const loginBody = {
    email: createUserBody.email,
    password_hash: createUserBody.password_hash,
  } satisfies ISubscriptionRenewalGuardianUser.ILogin;

  // 4. Perform login via /auth/user/login
  const loggedInUser: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: loginBody });
  typia.assert(loggedInUser);

  // 5. Validate that user id and email match between created and logged in users
  TestValidator.equals(
    "user id should match between join and login",
    loggedInUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "user email should match between join and login",
    loggedInUser.email,
    createdUser.email,
  );

  // 6. Validate that JWT tokens are issued and not empty
  TestValidator.predicate(
    "token access should be a non-empty string",
    typeof loggedInUser.token.access === "string" &&
      loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should be a non-empty string",
    typeof loggedInUser.token.refresh === "string" &&
      loggedInUser.token.refresh.length > 0,
  );

  // 7. Validate that token expiration timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "token expired_at should be ISO 8601 date-time string",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/.test(
      loggedInUser.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token refreshable_until should be ISO 8601 date-time string",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/.test(
      loggedInUser.token.refreshable_until,
    ),
  );
}
