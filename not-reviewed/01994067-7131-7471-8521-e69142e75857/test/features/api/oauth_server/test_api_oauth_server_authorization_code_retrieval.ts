import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

export async function test_api_oauth_server_authorization_code_retrieval(
  connection: api.IConnection,
) {
  // 1. Developer user registration
  const developerCreateBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    email_verified: true,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IOauthServerDeveloper.ICreate;

  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developer);

  // 2. Developer user login
  const developerLoginBody = {
    email: developer.email,
    password: developerCreateBody.password_hash,
  } satisfies IOauthServerDeveloper.ILogin;

  const developerLogin: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLogin);

  // 3. Create OAuth client
  const oauthClientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://${RandomGenerator.name(2).replace(/ /g, "")}.com/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);
  TestValidator.equals(
    "OAuth client_id equals created",
    oauthClient.client_id,
    oauthClientCreateBody.client_id,
  );

  // 4. Create Authorization Code
  const now = new Date();
  const expiresAtISOString = new Date(
    now.getTime() + 5 * 60 * 1000,
  ).toISOString();

  const authCodeCreateBody = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(32),
    data: JSON.stringify({
      scope: "read write",
      state: RandomGenerator.alphaNumeric(8),
    }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: expiresAtISOString,
  } satisfies IOauthServerAuthorizationCode.ICreate;

  const authCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      {
        body: authCodeCreateBody,
      },
    );
  typia.assert(authCode);
  TestValidator.equals(
    "Authorization code client_id match",
    authCode.oauth_client_id,
    oauthClient.id,
  );
  TestValidator.equals(
    "Authorization code redirect_uri match",
    authCode.redirect_uri,
    oauthClient.redirect_uri,
  );
  TestValidator.equals(
    "Authorization code code match",
    authCode.code,
    authCodeCreateBody.code,
  );

  // 5. Retrieve Authorization Code by ID
  const retrievedAuthCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.at(
      connection,
      {
        id: authCode.id,
      },
    );
  typia.assert(retrievedAuthCode);

  TestValidator.equals(
    "Retrieved authorization code matches ID",
    retrievedAuthCode.id,
    authCode.id,
  );
  TestValidator.equals(
    "Retrieved authorization code client_id matches",
    retrievedAuthCode.oauth_client_id,
    authCode.oauth_client_id,
  );
  TestValidator.equals(
    "Retrieved authorization code matches code",
    retrievedAuthCode.code,
    authCode.code,
  );
  TestValidator.equals(
    "Retrieved authorization code redirect_uri matches",
    retrievedAuthCode.redirect_uri,
    authCode.redirect_uri,
  );
  TestValidator.equals(
    "Retrieved authorization code expires_at matches",
    retrievedAuthCode.expires_at,
    authCode.expires_at,
  );

  // 6. Test error on invalid ID
  await TestValidator.error(
    "Invalid authorization code ID retrieval",
    async () => {
      await api.functional.oauthServer.developer.authorizationCodes.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
