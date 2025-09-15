import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRefreshToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerRefreshToken";

export async function test_api_member_refresh_tokens_successful_flow(
  connection: api.IConnection,
) {
  // 1. Register a new member user with valid email and password
  const email = `${RandomGenerator.alphabets(8)}@example.com`;
  const password = "SecurePassword123!";
  const joinBody = {
    email: email,
    password: password,
  } satisfies IOauthServerMember.ICreate;
  const joined: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(joined);
  TestValidator.equals("registered email matches", joined.email, email);

  // 2. Login the member user with the same credentials
  const loginBody = {
    email: email,
    password: password,
  } satisfies IOauthServerMember.ILogin;
  const loggedIn: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: loginBody });
  typia.assert(loggedIn);
  TestValidator.equals("login email matches", loggedIn.email, email);
  TestValidator.predicate(
    "login provides access token",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login provides refresh token",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );

  // 3. Search refresh tokens using the refresh token string
  const tokenSearchBody = {
    search: loggedIn.token.refresh,
    page: 1,
    limit: 10,
  } satisfies IOauthServerRefreshToken.IRequest;

  const tokenPage: IPageIOauthServerRefreshToken.ISummary =
    await api.functional.oauthServer.member.refreshTokens.index(connection, {
      body: tokenSearchBody,
    });
  typia.assert(tokenPage);

  // 4. Validate that the refresh token used in login appears in search results
  const found = tokenPage.data.find(
    (token) => token.token === loggedIn.token.refresh,
  );
  TestValidator.predicate(
    "refresh token found in token list",
    found !== undefined,
  );
}
