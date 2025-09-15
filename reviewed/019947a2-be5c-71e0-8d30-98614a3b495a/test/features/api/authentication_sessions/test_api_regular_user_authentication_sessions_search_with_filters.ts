import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppAuthenticationSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppAuthenticationSessions";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatAppAuthenticationSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatAppAuthenticationSessions";

export async function test_api_regular_user_authentication_sessions_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Regular user join
  const userCreateBody = {
    social_login_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const user: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Create multiple authentication sessions linked to user
  const sessionCount = 3;
  const sessions: IChatAppAuthenticationSessions[] = [];
  for (let i = 0; i < sessionCount; ++i) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * (i + 1));
    const accessToken = user.token.access + `-test${i}`;
    const refreshToken = user.token.refresh + `-r${i}`;

    const newSession =
      await api.functional.chatApp.regularUser.authenticationSessions.create(
        connection,
        {
          body: {
            chat_app_regular_user_id: user.id,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            deleted_at: null,
          } satisfies IChatAppAuthenticationSessions.ICreate,
        },
      );
    typia.assert(newSession);
    sessions.push(newSession);
  }

  // 3. Search sessions filtered by chat_app_regular_user_id
  const searchByUserIdResponse =
    await api.functional.chatApp.regularUser.authenticationSessions.index(
      connection,
      {
        body: {
          chat_app_regular_user_id: user.id,
          page: 1,
          limit: 10,
        } satisfies IChatAppAuthenticationSessions.IRequest,
      },
    );
  typia.assert(searchByUserIdResponse);

  // Validate all returned sessions belong to user
  for (const session of searchByUserIdResponse.data) {
    TestValidator.predicate(
      `session id ${session.id} is included in created sessions`,
      sessions.some((s) => s.id === session.id),
    );
  }

  // 4. Search sessions by partial access_token substring
  const tokenSubstring = sessions[0].access_token.substring(
    0,
    Math.min(10, sessions[0].access_token.length),
  );

  const searchByTokenResponse =
    await api.functional.chatApp.regularUser.authenticationSessions.index(
      connection,
      {
        body: {
          search: tokenSubstring,
          page: 1,
          limit: 10,
        } satisfies IChatAppAuthenticationSessions.IRequest,
      },
    );
  typia.assert(searchByTokenResponse);

  // Validate returned sessions' access_token contain the substring
  for (const session of searchByTokenResponse.data) {
    TestValidator.predicate(
      `session access_token contains ${tokenSubstring}`,
      session.access_token.includes(tokenSubstring),
    );
  }

  // 5. Test pagination by setting limit = 2
  const paginationResponse =
    await api.functional.chatApp.regularUser.authenticationSessions.index(
      connection,
      {
        body: {
          chat_app_regular_user_id: user.id,
          page: 1,
          limit: 2,
        } satisfies IChatAppAuthenticationSessions.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination limit respected",
    paginationResponse.data.length <= 2,
  );

  // 6. Negative test: attempt index without authentication should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "index without authentication should throw",
    async () => {
      await api.functional.chatApp.regularUser.authenticationSessions.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IChatAppAuthenticationSessions.IRequest,
        },
      );
    },
  );

  // 7. Negative test: invalid page number (-1) should fail
  await TestValidator.error(
    "index with invalid page number should throw",
    async () => {
      await api.functional.chatApp.regularUser.authenticationSessions.index(
        connection,
        {
          body: {
            page: -1,
            limit: 10,
          } satisfies IChatAppAuthenticationSessions.IRequest,
        },
      );
    },
  );
}
