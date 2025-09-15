import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppAuthenticationSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppAuthenticationSessions";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Validates creation of authentication session with a valid regular user.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new regular user via the join endpoint to create a valid user
 *    context.
 * 2. Creates an authentication session for that user with valid OAuth2 tokens
 *    and timestamps.
 * 3. Validates that the session is correctly linked to the user and that all
 *    token and timestamp fields are correctly returned.
 *
 * Business rules ensure no session can be created without an existing user,
 * and tokens must conform to expected formats.
 *
 * This test focuses on end-to-end validation of successful session creation
 * with correct data and strict type safety.
 */
export async function test_api_authentication_session_creation_with_valid_user(
  connection: api.IConnection,
) {
  // 1. Create a new regular user via auth.regularUser.join
  const newUserBody = {
    social_login_id: `snapchat_${RandomGenerator.alphaNumeric(8)}`,
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: newUserBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a valid authentication session linked to the new user
  const accessToken: string = RandomGenerator.alphaNumeric(32);
  const refreshToken: string = RandomGenerator.alphaNumeric(32);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString(); // Access token expiry in 1 hour
  const createdAt = now.toISOString();
  const updatedAt = createdAt;

  const sessionCreateBody = {
    chat_app_regular_user_id: authorizedUser.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: null,
  } satisfies IChatAppAuthenticationSessions.ICreate;

  const session: IChatAppAuthenticationSessions =
    await api.functional.chatApp.regularUser.authenticationSessions.create(
      connection,
      { body: sessionCreateBody },
    );
  typia.assert(session);

  // 3. Validations
  TestValidator.equals(
    "session user ID matches created user",
    session.chat_app_regular_user_id,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    typeof session.access_token === "string" && session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof session.refresh_token === "string" &&
      session.refresh_token.length > 0,
  );

  typia.assert(session.expires_at);
  typia.assert(session.created_at);
  typia.assert(session.updated_at);

  TestValidator.equals("deleted_at is null", session.deleted_at, null);
}
