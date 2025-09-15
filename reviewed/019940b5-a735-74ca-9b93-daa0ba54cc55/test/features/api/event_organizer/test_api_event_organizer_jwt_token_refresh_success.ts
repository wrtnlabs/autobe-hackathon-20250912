import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * Test successful JWT token refresh for an event organizer user.
 *
 * This test validates that an event organizer can successfully refresh
 * their JSON Web Tokens (JWTs) to maintain an authenticated session.
 *
 * The process involves:
 *
 * 1. Creating a new event organizer user using the join endpoint, capturing
 *    their authentication tokens.
 * 2. Using the refresh token from the created user to request new tokens from
 *    the refresh endpoint.
 * 3. Validating that the new tokens are correctly received and extend the
 *    session.
 *
 * This ensures the refresh functionality works correctly for event
 * organizer users, maintaining continuous authentication without requiring
 * login.
 */
export async function test_api_event_organizer_jwt_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Create a new event organizer user via join API
  const createBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null, // Optional, explicitly null
    profile_picture_url: null, // Optional, explicitly null
    email_verified: false,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const createdUser: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: createBody,
    });
  typia.assert(createdUser);

  // 2. Use the refresh token from the createdUser to obtain new tokens via refresh API
  const refreshBody = {
    refresh_token: createdUser.token.refresh,
  } satisfies IEventRegistrationEventOrganizer.IRefresh;

  const refreshedUser: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedUser);

  // 3. Validate new tokens differ from old tokens and extend session
  TestValidator.notEquals(
    "refresh token is refreshed",
    refreshedUser.token.refresh,
    createdUser.token.refresh,
  );
  TestValidator.notEquals(
    "access token is refreshed",
    refreshedUser.token.access,
    createdUser.token.access,
  );
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(refreshedUser.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is later than now",
    new Date(refreshedUser.token.refreshable_until).getTime() > Date.now(),
  );
}
