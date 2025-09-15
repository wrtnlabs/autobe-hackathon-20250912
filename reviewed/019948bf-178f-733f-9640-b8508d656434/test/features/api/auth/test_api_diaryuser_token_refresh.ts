import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";

/**
 * Validate the refresh flow for the single stateless diaryUser.
 *
 * 1. Obtain initial diaryUser session via /auth/diaryUser/join
 * 2. Call /auth/diaryUser/refresh (should return new access token with matching
 *    id/created_at)
 * 3. Validate user id and created_at are unchanged
 * 4. Attempt refresh with no token, expect error
 * 5. Attempt refresh with a deliberately corrupted/invalid token, expect error
 */
export async function test_api_diaryuser_token_refresh(
  connection: api.IConnection,
) {
  // 1. Obtain initial diaryUser session
  const session: IMoodDiaryDiaryUser.IAuthorized =
    await api.functional.auth.diaryUser.join(connection);
  typia.assert(session);

  const prevAccess = session.token.access;
  const prevRefresh = session.token.refresh;
  const prevId = session.id;
  const prevCreated = session.created_at;

  // 2. Call refresh: /auth/diaryUser/refresh (should issue new access token)
  connection.headers = { Authorization: prevRefresh };
  const refreshed: IMoodDiaryDiaryUser.IAuthorized =
    await api.functional.auth.diaryUser.refresh(connection);
  typia.assert(refreshed);
  TestValidator.equals("refreshed user id matches", refreshed.id, prevId);
  TestValidator.equals(
    "refreshed created_at matches",
    refreshed.created_at,
    prevCreated,
  );
  TestValidator.notEquals(
    "new access token is different",
    refreshed.token.access,
    prevAccess,
  );

  // 3. Refresh WITHOUT a token (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("refresh with no token fails", async () => {
    await api.functional.auth.diaryUser.refresh(unauthConn);
  });

  // 4. Refresh with an invalid token (should error)
  const badConn: api.IConnection = {
    ...connection,
    headers: { Authorization: prevRefresh.slice(0, -2) + "zz" },
  };
  await TestValidator.error("refresh with tampered token fails", async () => {
    await api.functional.auth.diaryUser.refresh(badConn);
  });
}
