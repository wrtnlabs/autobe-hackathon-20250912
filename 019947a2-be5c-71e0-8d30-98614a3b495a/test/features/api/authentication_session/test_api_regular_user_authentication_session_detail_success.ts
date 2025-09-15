import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppAuthenticationSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppAuthenticationSessions";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

export async function test_api_regular_user_authentication_session_detail_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user
  const createUserBody = {
    social_login_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createUserBody,
    });
  typia.assert(authorizedUser);

  // 2. Login the created user (using social_login_id)
  const loginBody = {
    social_login_id: authorizedUser.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;

  const loginResult: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);
  TestValidator.equals(
    "login user id equals created user id",
    loginResult.id,
    authorizedUser.id,
  );

  // 3. Create authentication session for the user
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60); // +1 hour

  const sessionCreateBody = {
    chat_app_regular_user_id: authorizedUser.id,
    access_token: RandomGenerator.alphaNumeric(30),
    refresh_token: RandomGenerator.alphaNumeric(30),
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    deleted_at: null,
  } satisfies IChatAppAuthenticationSessions.ICreate;

  const createdSession: IChatAppAuthenticationSessions =
    await api.functional.chatApp.regularUser.authenticationSessions.create(
      connection,
      { body: sessionCreateBody },
    );
  typia.assert(createdSession);
  TestValidator.equals(
    "session user id matches created user id",
    createdSession.chat_app_regular_user_id,
    authorizedUser.id,
  );

  // 4. Retrieve the authentication session detail by user ID and session ID
  const retrievedSession: IChatAppAuthenticationSessions =
    await api.functional.chatApp.regularUser.regularUsers.authenticationSessions.at(
      connection,
      {
        regularUserId: authorizedUser.id,
        authenticationSessionId: createdSession.id,
      },
    );
  typia.assert(retrievedSession);

  TestValidator.equals(
    "retrieved session id matches created session id",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "retrieved session user id matches regular user id",
    retrievedSession.chat_app_regular_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "retrieved session access token matches created one",
    retrievedSession.access_token,
    sessionCreateBody.access_token,
  );
  TestValidator.equals(
    "retrieved session refresh token matches created one",
    retrievedSession.refresh_token,
    sessionCreateBody.refresh_token,
  );
  TestValidator.equals(
    "retrieved session expires_at matches created one",
    retrievedSession.expires_at,
    sessionCreateBody.expires_at,
  );
  TestValidator.equals(
    "retrieved session created_at matches created one",
    retrievedSession.created_at,
    sessionCreateBody.created_at,
  );
  TestValidator.equals(
    "retrieved session updated_at matches created one",
    retrievedSession.updated_at,
    sessionCreateBody.updated_at,
  );
  TestValidator.equals(
    "retrieved session deleted_at is null",
    retrievedSession.deleted_at,
    null,
  );

  // 5. Negative test: unauthorized user cannot access this session detail
  // Create another user
  const createUserBody2 = {
    social_login_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const otherUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createUserBody2,
    });
  typia.assert(otherUser);

  // Login as the other user
  const loginBody2 = {
    social_login_id: otherUser.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;

  const loginResult2: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody2,
    });
  typia.assert(loginResult2);

  // Switch to other user context by performing login again (SDK manages token header)

  // Attempt access to the created session with other user
  await TestValidator.error(
    "non-owner user cannot access other's authentication session",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.authenticationSessions.at(
        connection,
        {
          regularUserId: authorizedUser.id,
          authenticationSessionId: createdSession.id,
        },
      );
    },
  );

  // 6. Negative test: accessing non-existent session
  await TestValidator.error(
    "accessing non-existent authentication session should fail",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.authenticationSessions.at(
        connection,
        {
          regularUserId: authorizedUser.id,
          authenticationSessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
