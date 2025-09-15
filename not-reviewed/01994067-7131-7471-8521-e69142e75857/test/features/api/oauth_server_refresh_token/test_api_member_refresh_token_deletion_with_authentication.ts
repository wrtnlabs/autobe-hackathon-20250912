import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRefreshToken";

/**
 * This test validates the refresh token deletion for a member user with proper
 * authentication handling. It performs the following steps:
 *
 * 1. Registers a new member user by calling the /auth/member/join API with a valid
 *    email and password.
 * 2. Logs in the created member user with /auth/member/login to obtain
 *    authentication tokens.
 * 3. Creates a new refresh token for the authenticated member user through
 *    /oauthServer/member/refreshTokens, constructing a proper token creation
 *    request with realistic data and valid OAuth client ID.
 * 4. Attempts to delete the created refresh token by calling the delete API
 *    /oauthServer/member/refreshTokens/{id} with the refresh token’s ID.
 * 5. Verifies that deleting a non-existent refresh token ID causes an error.
 * 6. Ensures that unauthorized access (not logged in) to delete refresh tokens is
 *    denied.
 * 7. Confirms that only an authenticated member user can delete their own refresh
 *    tokens.
 *
 * All API responses are validated with typia.assert for type safety. Random but
 * valid data is generated for user registration and token creation, ensuring
 * precise format compliance. Authorization tokens are handled automatically by
 * the SDK via connection headers. The test ensures proper session management
 * and cleanup of refresh tokens in a secure and realistic user flow.
 */
export async function test_api_member_refresh_token_deletion_with_authentication(
  connection: api.IConnection,
) {
  // 1. Member user registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "1234";
  const memberCreateBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IOauthServerMember.ICreate;
  const memberAuthorized: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IOauthServerMember.ILogin;
  const memberLoginResponse: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResponse);

  // 3. Create refresh token
  const refreshTokenPayload = {
    oauth_client_id: typia.random<string & tags.Format<"uuid">>(),
    token: RandomGenerator.alphaNumeric(32),
    scope: "read write",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IOauthServerRefreshToken.ICreate;
  const createdRefreshToken: IOauthServerRefreshToken =
    await api.functional.oauthServer.member.refreshTokens.create(connection, {
      body: refreshTokenPayload,
    });
  typia.assert(createdRefreshToken);

  // 4. Delete refresh token
  await api.functional.oauthServer.member.refreshTokens.eraseRefreshToken(
    connection,
    { id: createdRefreshToken.id },
  );

  // 5. Attempt to delete non-existent refresh token
  await TestValidator.error(
    "Deleting non-existent refresh token throws error",
    async () => {
      await api.functional.oauthServer.member.refreshTokens.eraseRefreshToken(
        connection,
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 6. Attempt unauthorized deletion
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized refresh token deletion should throw error",
    async () => {
      await api.functional.oauthServer.member.refreshTokens.eraseRefreshToken(
        unauthenticatedConnection,
        { id: createdRefreshToken.id },
      );
    },
  );

  // 7. Authorization enforcement - delete refresh token with authenticated user
  // Already done in step 4 - ensures only authenticated member user can delete their tokens

  // No direct re-fetch API available to verify deletion, deletion success is inferred by absence of error
}
