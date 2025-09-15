import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * This test validates the successful authentication workflow of an event
 * organizer user. It performs the full sequence from user registration to
 * login, confirming that only event organizers with verified emails can
 * authenticate successfully.
 *
 * Steps:
 *
 * 1. Register an event organizer account using the join endpoint with valid
 *    credentials and email verification set to true.
 * 2. Assert that the returned authorized user object matches expected properties
 *    including valid UUID, email, tokens, and timestamps.
 * 3. Perform login with the same email and password hash to retrieve an authorized
 *    user response containing JWT tokens.
 * 4. Validate that the login response includes all required properties and token
 *    information correctly.
 */
export async function test_api_event_organizer_login_success(
  connection: api.IConnection,
) {
  // 1. Create event organizer user with verified email
  const email = RandomGenerator.alphaNumeric(8).toLowerCase() + "@test.com";
  const password = "password123";
  const password_hash = password; // For test, simulating hash directly
  const full_name = RandomGenerator.name();
  const phone_number = null;
  const profile_picture_url = null;
  const email_verified = true;

  const createBody = {
    email: email,
    password_hash: password_hash,
    full_name: full_name,
    phone_number: phone_number,
    profile_picture_url: profile_picture_url,
    email_verified: email_verified,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const authorized: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Validate required properties on authorized user
  TestValidator.predicate(
    "user.id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      authorized.id,
    ),
  );
  TestValidator.equals("user.email matches", authorized.email, email);
  TestValidator.equals(
    "user.full_name matches",
    authorized.full_name,
    full_name,
  );
  TestValidator.equals(
    "user.email_verified is true",
    authorized.email_verified,
    true,
  );
  TestValidator.equals(
    "user.phone_number is null",
    authorized.phone_number,
    null,
  );
  TestValidator.equals(
    "user.profile_picture_url is null",
    authorized.profile_picture_url,
    null,
  );

  // Validate token properties presence and types
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(token.expired_at),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      token.refreshable_until,
    ),
  );

  // 2. Login with the same credentials
  const loginBody = {
    email: email,
    password_hash: password_hash,
  } satisfies IEventRegistrationEventOrganizer.ILogin;

  const loginAuthorized: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // Validate login authorized user
  TestValidator.equals(
    "login user.id matches join user.id",
    loginAuthorized.id,
    authorized.id,
  );
  TestValidator.equals(
    "login user.email matches join user.email",
    loginAuthorized.email,
    authorized.email,
  );
  TestValidator.equals(
    "login user.full_name matches join user.full_name",
    loginAuthorized.full_name,
    authorized.full_name,
  );
  TestValidator.equals(
    "login user.email_verified is true",
    loginAuthorized.email_verified,
    true,
  );
  TestValidator.equals(
    "login user.phone_number is null",
    loginAuthorized.phone_number,
    null,
  );
  TestValidator.equals(
    "login user.profile_picture_url is null",
    loginAuthorized.profile_picture_url,
    null,
  );

  // Validate login token
  const loginToken: IAuthorizationToken = loginAuthorized.token;
  TestValidator.predicate(
    "login token.access is string and non-empty",
    typeof loginToken.access === "string" && loginToken.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh is string and non-empty",
    typeof loginToken.refresh === "string" && loginToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token.expired_at is ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(loginToken.expired_at),
  );
  TestValidator.predicate(
    "login token.refreshable_until is ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loginToken.refreshable_until,
    ),
  );
}
