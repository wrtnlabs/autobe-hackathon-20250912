import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Test scenario for the regular user login process via Snapchat social
 * login.
 *
 * This test will:
 *
 * 1. Create a regular user via /auth/regularUser/join.
 * 2. Attempt a successful login with the created social_login_id.
 * 3. Assert that the login response contains valid authorized user data and
 *    tokens.
 * 4. Attempt a login with a non-existent social_login_id to verify error
 *    handling.
 *
 * All request bodies use the appropriate DTOs with required fields only.
 * Responses are asserted for full conformance with DTO types. Errors during
 * invalid logins are asserted to be thrown.
 */
export async function test_api_regular_user_login_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Create a new regular user via join endpoint
  const joinBody = {
    social_login_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const createdUser = await api.functional.auth.regularUser.join(connection, {
    body: joinBody,
  });
  typia.assert(createdUser);

  // 2. Successful login attempt with the created social_login_id
  const loginBodySuccess = {
    social_login_id: createdUser.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;

  const loginSuccess = await api.functional.auth.regularUser.login(connection, {
    body: loginBodySuccess,
  });
  typia.assert(loginSuccess);

  // 3. Validate returned authorized user data
  TestValidator.equals(
    "login: returned user id echoes join response",
    loginSuccess.id,
    createdUser.id,
  );
  TestValidator.equals(
    "login: social_login_id matches",
    loginSuccess.social_login_id,
    createdUser.social_login_id,
  );
  TestValidator.equals(
    "login: nickname matches",
    loginSuccess.nickname,
    createdUser.nickname,
  );
  TestValidator.equals(
    "login: profile_image_uri matches",
    loginSuccess.profile_image_uri ?? null,
    createdUser.profile_image_uri ?? null,
  );

  // Check JWT token properties existence
  TestValidator.predicate(
    "login: token.access exists and is string",
    typeof loginSuccess.token.access === "string" &&
      loginSuccess.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: token.refresh exists and is string",
    typeof loginSuccess.token.refresh === "string" &&
      loginSuccess.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login: token.expired_at exists and is ISO string",
    typeof loginSuccess.token.expired_at === "string",
  );
  TestValidator.predicate(
    "login: token.refreshable_until exists and is ISO string",
    typeof loginSuccess.token.refreshable_until === "string",
  );

  // 4. Invalid login attempt with a non-existent social_login_id
  const loginBodyInvalid = {
    social_login_id: RandomGenerator.alphaNumeric(20), // Random likely invalid
  } satisfies IChatAppRegularUser.IRequestLogin;

  await TestValidator.error(
    "login with non-existent social_login_id should fail",
    async () => {
      await api.functional.auth.regularUser.login(connection, {
        body: loginBodyInvalid,
      });
    },
  );
}
