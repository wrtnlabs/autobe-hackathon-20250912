import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerIdToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerIdToken";

export async function test_api_id_token_search_with_oauth_client_dependency(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IOauthServerMember.ICreate;
  const memberAuthorized: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(memberAuthorized);

  // 2. Register and authenticate admin user (for oauth client creation)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    email_verified: true,
  } satisfies IOauthServerAdmin.ICreate;
  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
    } satisfies IOauthServerAdmin.ILogin,
  });

  // 3. Create OAuth client as admin
  const oauthClientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://${RandomGenerator.name(2).replace(/ /g, "")}.com/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 4. Register and authenticate developer user
  const developerPassword = RandomGenerator.alphaNumeric(8);
  const developerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password_hash: developerPassword, // Using password hash directly as plaintext for test
  } satisfies IOauthServerDeveloper.ICreate;
  const developerAuthorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(developerAuthorized);
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerJoinBody.email,
      password: developerPassword,
    } satisfies IOauthServerDeveloper.ILogin,
  });

  // 5. Create authorization code as developer
  const authCodeCreateBody = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(24),
    data: JSON.stringify({ requested_scopes: ["openid", "profile"] }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  } satisfies IOauthServerAuthorizationCode.ICreate;
  const authCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      { body: authCodeCreateBody },
    );
  typia.assert(authCode);

  // 6. Login as member (to perform ID token search)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberJoinBody.email,
      password: memberJoinBody.password,
    } satisfies IOauthServerMember.ILogin,
  });

  // 7. Search ID tokens related to the created OAuth client
  const searchRequestBody = {
    oauth_client_id: oauthClient.id,
    page: 1,
    limit: 10,
  } satisfies IOauthServerIdToken.IRequest;
  const searchResult: IPageIOauthServerIdToken.ISummary =
    await api.functional.oauthServer.member.idTokens.indexIdToken(connection, {
      body: searchRequestBody,
    });
  typia.assert(searchResult);
  TestValidator.predicate(
    "pagination properties exist",
    typeof searchResult.pagination.current === "number" &&
      typeof searchResult.pagination.limit === "number" &&
      typeof searchResult.pagination.records === "number" &&
      typeof searchResult.pagination.pages === "number",
  );
  TestValidator.predicate(
    "all ID tokens have non-empty token strings",
    searchResult.data.every(
      (token) => typeof token.token === "string" && token.token.length > 0,
    ),
  );

  // 8. Edge case: search with no matching records (random non-existent client id)
  const nonexistentSearchBody = {
    oauth_client_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  } satisfies IOauthServerIdToken.IRequest;
  const noMatchResult: IPageIOauthServerIdToken.ISummary =
    await api.functional.oauthServer.member.idTokens.indexIdToken(connection, {
      body: nonexistentSearchBody,
    });
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no matches returns empty data",
    noMatchResult.data.length,
    0,
  );

  // 9. Edge case: invalid filter parameters (zero and negative page and limit)
  const invalidRequests: IOauthServerIdToken.IRequest[] = [
    { page: 0, limit: 10 },
    { page: 1, limit: 0 },
    { page: -1, limit: 10 },
    { page: 1, limit: -5 },
  ];
  for (const invalid of invalidRequests) {
    await TestValidator.error(
      "invalid pagination parameters should fail",
      async () => {
        await api.functional.oauthServer.member.idTokens.indexIdToken(
          connection,
          { body: invalid },
        );
      },
    );
  }
}
