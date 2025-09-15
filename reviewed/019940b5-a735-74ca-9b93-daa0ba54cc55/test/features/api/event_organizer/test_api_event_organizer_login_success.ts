import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * Test for successful event organizer login after registration.
 *
 * This test ensures that an event organizer can register successfully with
 * valid credentials and then log in using those credentials. It verifies
 * that only users with verified email addresses can log in and receive
 * valid JWT tokens.
 *
 * Steps:
 *
 * 1. Register a new event organizer with all required fields including
 *    email_verified set to true.
 * 2. Assert that the registration response matches the input and email is
 *    verified.
 * 3. Attempt login with the registered email and password_hash.
 * 4. Validate the login response including matching email, verification
 *    status, and presence of JWT tokens.
 */
export async function test_api_event_organizer_login_success(
  connection: api.IConnection,
) {
  // 1. Event Organizer joins with valid data
  const fullName = RandomGenerator.name();
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // assume 64 char hashed password

  const joinBody = {
    email,
    password_hash: passwordHash,
    full_name: fullName,
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const joined: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  TestValidator.equals(
    "joined email matches input",
    joined.email,
    joinBody.email,
  );

  TestValidator.predicate("email is verified", joined.email_verified === true);

  TestValidator.predicate(
    "full name is non-empty",
    typeof joined.full_name === "string" && joined.full_name.length > 0,
  );

  // 2. Login with correct email and password_hash
  const loginBody = {
    email,
    password_hash: passwordHash,
  } satisfies IEventRegistrationEventOrganizer.ILogin;

  const loginResult: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  TestValidator.equals(
    "login email matches",
    loginResult.email,
    loginBody.email,
  );

  TestValidator.predicate(
    "login email is verified",
    loginResult.email_verified === true,
  );

  TestValidator.predicate(
    "login token access present",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );

  TestValidator.predicate(
    "login token refresh present",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
}
