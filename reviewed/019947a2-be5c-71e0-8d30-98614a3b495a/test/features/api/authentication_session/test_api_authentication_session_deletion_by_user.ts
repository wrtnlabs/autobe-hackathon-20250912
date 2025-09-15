import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppAuthenticationSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppAuthenticationSessions";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * End-to-end test for the deletion of a regular user's authentication
 * session.
 *
 * This test ensures that a regular user can create an account, log in,
 * create an authentication session, and subsequently delete that session
 * securely. It validates session ownership enforcement by requiring that
 * only the owning user can delete their session. The test also verifies
 * correct error handling when attempting to delete a non-existent session.
 *
 * Test Workflow:
 *
 * 1. Register a new regular user.
 * 2. Log in the registered user.
 * 3. Create a new authentication session for the user.
 * 4. Delete the created authentication session.
 * 5. Confirm successful deletion by absence of errors.
 * 6. Attempt to delete a non-existent session and expect an error.
 */
export async function test_api_authentication_session_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register new regular user
  const joinBody = {
    social_login_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const user: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Login the same user
  const loginBody = {
    social_login_id: user.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;
  const loginUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Create authentication session
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000); // 1 hour later

  const sessionCreateBody = {
    chat_app_regular_user_id: user.id,
    access_token: RandomGenerator.alphaNumeric(32),
    refresh_token: RandomGenerator.alphaNumeric(32),
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    deleted_at: null,
  } satisfies IChatAppAuthenticationSessions.ICreate;

  const session: IChatAppAuthenticationSessions =
    await api.functional.chatApp.regularUser.authenticationSessions.create(
      connection,
      { body: sessionCreateBody },
    );
  typia.assert(session);

  // 4. Delete the authentication session
  await api.functional.chatApp.regularUser.regularUsers.authenticationSessions.erase(
    connection,
    {
      regularUserId: user.id,
      authenticationSessionId: session.id,
    },
  );

  // 5. Attempt to delete a non-existent session ID, expecting an error
  await TestValidator.error(
    "delete non-existent session should fail",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.authenticationSessions.erase(
        connection,
        {
          regularUserId: user.id,
          authenticationSessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
