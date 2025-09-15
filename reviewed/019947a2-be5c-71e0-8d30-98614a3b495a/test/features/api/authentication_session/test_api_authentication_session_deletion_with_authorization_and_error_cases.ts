import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppAuthenticationSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppAuthenticationSessions";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Test the deletion (hard delete) of authentication sessions for regular users,
 * verifying authorization and error handling.
 *
 * This test performs the following steps:
 *
 * 1. Create a regular user with unique social_login_id and nickname.
 * 2. Create an authentication session associated with the created user, including
 *    proper OAuth2 tokens and timestamps.
 * 3. Delete the authentication session successfully and confirm deletion.
 * 4. Test error cases:
 *
 *    - Attempt to delete a session with a random non-existent session ID (expect 404
 *         error).
 *    - Create another regular user, then attempt to delete the first user's session
 *         as the unauthorized user (expect authorization failure).
 *
 * Validates business rule that only session owner can delete their
 * authentication sessions.
 */
export async function test_api_authentication_session_deletion_with_authorization_and_error_cases(
  connection: api.IConnection,
) {
  // 1. Create first regular user
  const socialLoginId1 = `user_${RandomGenerator.alphaNumeric(10)}`;
  const nickname1 = RandomGenerator.name();
  const user1: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: socialLoginId1,
        nickname: nickname1,
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(user1);

  // 2. Create authentication session for user1
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1 hour from now
  const createdAt = now.toISOString();
  const updatedAt = createdAt;

  const session1Create = {
    chat_app_regular_user_id: user1.id,
    access_token: RandomGenerator.alphaNumeric(32),
    refresh_token: RandomGenerator.alphaNumeric(32),
    expires_at: expiresAt,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: null,
  } satisfies IChatAppAuthenticationSessions.ICreate;

  const session1: IChatAppAuthenticationSessions =
    await api.functional.chatApp.regularUser.authenticationSessions.create(
      connection,
      {
        body: session1Create,
      },
    );
  typia.assert(session1);

  // 3. Delete session1 successfully
  await api.functional.chatApp.regularUser.authenticationSessions.erase(
    connection,
    {
      authenticationSessionId: session1.id,
    },
  );

  // 4. Attempt to delete same session again to confirm removal (expect 404 error)
  await TestValidator.error(
    "Delete after removal should fail with 404",
    async () => {
      await api.functional.chatApp.regularUser.authenticationSessions.erase(
        connection,
        {
          authenticationSessionId: session1.id,
        },
      );
    },
  );

  // 5. Attempt to delete using a random non-existent authenticationSessionId
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Delete with non-existent session ID should fail with 404",
    async () => {
      await api.functional.chatApp.regularUser.authenticationSessions.erase(
        connection,
        {
          authenticationSessionId: randomSessionId,
        },
      );
    },
  );

  // 6. Create another regular user
  const socialLoginId2 = `user_${RandomGenerator.alphaNumeric(10)}`;
  const nickname2 = RandomGenerator.name();
  const user2: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: socialLoginId2,
        nickname: nickname2,
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(user2);

  // 7. Create a session for user1 again to test unauthorized deletion
  const session2Create = {
    chat_app_regular_user_id: user1.id,
    access_token: RandomGenerator.alphaNumeric(32),
    refresh_token: RandomGenerator.alphaNumeric(32),
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IChatAppAuthenticationSessions.ICreate;

  const session2: IChatAppAuthenticationSessions =
    await api.functional.chatApp.regularUser.authenticationSessions.create(
      connection,
      {
        body: session2Create,
      },
    );
  typia.assert(session2);

  // 8. Switch to user2 (unauthorized user) by joining again and expecting JWT to be used
  // (Assuming join operation handles authentication token updating. No manual header manipulation.)
  // No explicit login API given; the join serves as both register and authentication.

  // 9. Attempt unauthorized deletion by user2 of user1's session
  await TestValidator.error(
    "Unauthorized user cannot delete another user's session",
    async () => {
      await api.functional.chatApp.regularUser.authenticationSessions.erase(
        connection,
        {
          authenticationSessionId: session2.id,
        },
      );
    },
  );
}
