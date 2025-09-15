import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * This E2E test verifies the complete workflow for OAuth authorization code
 * creation by a developer user.
 *
 * It includes developer user registration, login, OAuth client creation,
 * authorization code creation, and validation of responses and error
 * conditions.
 *
 * The business logic ensures only authenticated developers create authorization
 * codes uniquely linked to existing OAuth clients. Edge cases cover duplicate
 * codes and invalid client references.
 */
export async function test_api_oauth_server_authorization_code_creation(
  connection: api.IConnection,
) {
  // 1. Developer user registration
  const devEmail = `${RandomGenerator.name(2).replace(/\s/g, ".").toLowerCase()}@example.com`;
  const devPassword = "testpassword";
  const devCreateBody = {
    email: devEmail,
    email_verified: false,
    password_hash: typia.random<
      string & tags.MinLength<64> & tags.MaxLength<128>
    >(),
  } satisfies IOauthServerDeveloper.ICreate;

  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: devCreateBody,
    });
  typia.assert(developer);
  TestValidator.predicate(
    "developer email matches",
    developer.email === devEmail,
  );
  TestValidator.predicate(
    "developer email not verified initially",
    developer.email_verified === false,
  );

  // 2. Developer login
  const loginBody = {
    email: devEmail,
    password: devPassword,
  } satisfies IOauthServerDeveloper.ILogin;

  const developerLogin: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: loginBody,
    });
  typia.assert(developerLogin);
  TestValidator.equals(
    "login email equals registered email",
    developerLogin.email,
    devEmail,
  );

  // 3. Create OAuth client
  const clientId = RandomGenerator.alphaNumeric(16);
  const clientSecret = RandomGenerator.alphaNumeric(32);
  const redirectUri = `https://www.example.com/callback/${RandomGenerator.alphaNumeric(8)}`;

  const oauthClientCreateBody = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    logo_uri: null,
    is_trusted: RandomGenerator.pick([true, false] as const),
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  TestValidator.equals(
    "created client id matches request client_id",
    oauthClient.client_id,
    clientId,
  );
  TestValidator.equals(
    "created client redirect_uri matches request",
    oauthClient.redirect_uri,
    redirectUri,
  );

  // 4. Create authorization code linked to OAuth client
  // Compose unique code string
  const authCodeString = RandomGenerator.alphaNumeric(40);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 10).toISOString(); // 10 minutes later

  const authCodeCreateBody = {
    oauth_client_id: oauthClient.id,
    code: authCodeString,
    data: JSON.stringify({ scope: "read", state: "xyz" }),
    redirect_uri: redirectUri,
    expires_at: expiresAt,
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
    "authorization code code matches input",
    authCode.code,
    authCodeString,
  );
  TestValidator.equals(
    "authorization code client id matches oauthClient",
    authCode.oauth_client_id,
    oauthClient.id,
  );
  TestValidator.equals(
    "authorization code redirect URI matches client",
    authCode.redirect_uri,
    redirectUri,
  );

  // 5. Error case: invalid oauth_client_id
  const invalidClientId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "authorization code creation fails with invalid oauth_client_id",
    async () => {
      const invalidAuthCodeBody = {
        oauth_client_id: invalidClientId,
        code: RandomGenerator.alphaNumeric(40),
        data: JSON.stringify({ scope: "read" }),
        redirect_uri: redirectUri,
        expires_at: expiresAt,
      } satisfies IOauthServerAuthorizationCode.ICreate;
      await api.functional.oauthServer.developer.authorizationCodes.create(
        connection,
        {
          body: invalidAuthCodeBody,
        },
      );
    },
  );

  // 6. Error case: duplicate code string
  await TestValidator.error(
    "authorization code creation fails with duplicate code string",
    async () => {
      const dupAuthCodeBody = {
        oauth_client_id: oauthClient.id,
        code: authCodeString, // duplicate code
        data: JSON.stringify({ scope: "read" }),
        redirect_uri: redirectUri,
        expires_at: expiresAt,
      } satisfies IOauthServerAuthorizationCode.ICreate;
      await api.functional.oauthServer.developer.authorizationCodes.create(
        connection,
        {
          body: dupAuthCodeBody,
        },
      );
    },
  );
}
