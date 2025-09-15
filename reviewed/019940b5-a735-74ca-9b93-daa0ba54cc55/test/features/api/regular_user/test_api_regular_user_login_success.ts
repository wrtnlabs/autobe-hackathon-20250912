import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

export async function test_api_regular_user_login_success(
  connection: api.IConnection,
) {
  // 1. Register a regular user account with verified email
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(32);
  const full_name = RandomGenerator.name();

  const joinBody = {
    email,
    password_hash,
    full_name,
    email_verified: true,
    phone_number: null,
    profile_picture_url: null,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const joinedUser = await api.functional.auth.regularUser.join.joinRegularUser(
    connection,
    { body: joinBody },
  );
  typia.assert(joinedUser);

  // 2. Login using the registered credentials
  const loginBody = {
    email,
    password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const loggedInUser =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Validate that email from joinedUser and loggedInUser matches
  TestValidator.equals(
    "logged in user email matches registered email",
    loggedInUser.email,
    joinedUser.email,
  );

  // 4. Validate that full_name from joinedUser and loggedInUser matches
  TestValidator.equals(
    "logged in user full name matches registered full name",
    loggedInUser.full_name,
    joinedUser.full_name,
  );

  // 5. Validate that the token access strings are not empty
  TestValidator.predicate(
    "access token should be non-empty",
    typeof loggedInUser.token.access === "string" &&
      loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    typeof loggedInUser.token.refresh === "string" &&
      loggedInUser.token.refresh.length > 0,
  );

  // 6. Validate that email_verified flag is true
  TestValidator.equals(
    "email verified flag should be true",
    loggedInUser.email_verified,
    true,
  );
}
