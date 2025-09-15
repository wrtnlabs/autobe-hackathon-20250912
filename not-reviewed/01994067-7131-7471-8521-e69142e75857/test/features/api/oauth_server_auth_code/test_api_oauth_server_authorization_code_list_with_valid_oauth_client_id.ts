import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerAuthorizationCode";

export async function test_api_oauth_server_authorization_code_list_with_valid_oauth_client_id(
  connection: api.IConnection,
) {
  // Step 1-2: Developer user registration and login
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "ValidPass123!";
  const createBody = {
    email,
    email_verified: true,
    password_hash: password, // Assuming backend hashes this internally for testing
  } satisfies IOauthServerDeveloper.ICreate;

  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, { body: createBody });
  typia.assert(developer);

  // For login, use email and password
  const loginBody = {
    email,
    password,
  } satisfies IOauthServerDeveloper.ILogin;
  const login: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, { body: loginBody });
  typia.assert(login);

  // Step 3: Create OAuth Client
  const oauthClientData = {
    client_id: RandomGenerator.alphaNumeric(12),
    client_secret: RandomGenerator.alphaNumeric(24),
    redirect_uri: `https://${RandomGenerator.alphabets(8)}.com/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientData,
    });
  typia.assert(oauthClient);

  // Step 4: List authorization codes with OAuth client ID filter
  const listBody = {
    oauth_client_id: oauthClient.id,
    page: 0,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
    search: null,
    expires_before: null,
    expires_after: null,
  } satisfies IOauthServerAuthorizationCode.IRequest;

  const authCodePage: IPageIOauthServerAuthorizationCode.ISummary =
    await api.functional.oauthServer.developer.authorizationCodes.index(
      connection,
      { body: listBody },
    );
  typia.assert(authCodePage);

  // Validate all authorization codes belong to the created OAuth client
  for (const code of authCodePage.data) {
    TestValidator.equals(
      "authorization code belongs to client",
      code.oauth_client_id,
      oauthClient.id,
    );
  }

  // Validate pagination info
  const pagination = authCodePage.pagination;
  TestValidator.predicate("pagination current >= 0", pagination.current >= 0);
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate(
    "pagination pages correct",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );

  // Step 5: Test edge case - No authorization codes for random client ID
  const randomClientId = typia.random<string & tags.Format<"uuid">>();
  const emptyListBody = {
    oauth_client_id: randomClientId,
    page: 0,
    limit: 10,
    orderBy: null,
    orderDirection: null,
    search: null,
    expires_before: null,
    expires_after: null,
  } satisfies IOauthServerAuthorizationCode.IRequest;

  const emptyAuthCodePage: IPageIOauthServerAuthorizationCode.ISummary =
    await api.functional.oauthServer.developer.authorizationCodes.index(
      connection,
      { body: emptyListBody },
    );
  typia.assert(emptyAuthCodePage);
  TestValidator.equals(
    "empty result data length",
    emptyAuthCodePage.data.length,
    0,
  );
}
