import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * Test scenario for creating an OAuth server access token with all required
 * dependencies.
 *
 * The scenario includes:
 *
 * 1. Admin user registration and login to establish an authenticated context.
 * 2. Creation of an OAuth client that will be referenced by the access token.
 * 3. Developer user registration and login for creating an authorization code.
 * 4. Creation of an authorization code linked to the OAuth client to simulate
 *    OAuth flow.
 * 5. Creation of an access token that uses the referenced OAuth client and
 *    authorization code.
 *
 * Each step verifies that the operations succeed and validate the
 * relationships and properties as expected, ensuring business rules,
 * authorization checks, and data consistency across OAuth components.
 *
 * @param connection - The API connection for making requests
 */
export async function test_api_oauth_server_access_token_creation_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Admin user sign up for initial admin authorization context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "adminPassword123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user login to get authorization tokens for admin operations
  const adminLoggedIn: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "adminPassword123!",
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. OAuth client creation for access token linking
  const oauthClientData = {
    client_id: RandomGenerator.alphaNumeric(16), // unique client id
    client_secret: RandomGenerator.alphaNumeric(32), // secret
    redirect_uri: `https://example.com/callback/${RandomGenerator.alphaNumeric(8)}`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientData,
    });
  typia.assert(oauthClient);

  // 4. Developer registration for authorization code creation
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPassword = "developerPassword123!";
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: developerPassword, // Using the plaintext password as hash for test consistency
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  // 5. Developer login
  const developerLoggedIn: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: developerPassword,
      } satisfies IOauthServerDeveloper.ILogin,
    });
  typia.assert(developerLoggedIn);

  // 6. Create authorization code linked to OAuth client
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // expire in 5 minutes

  const authCodeData = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(40),
    data: JSON.stringify({
      scope: "read write",
      client_id: oauthClient.client_id,
    }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: expiresAt,
  } satisfies IOauthServerAuthorizationCode.ICreate;

  const authorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      { body: authCodeData },
    );
  typia.assert(authorizationCode);

  // 7. Create OAuth access token linked with the OAuth client and authorization code
  const accessTokenData = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authorizationCode.id,
    token: RandomGenerator.alphaNumeric(64),
    scope: "read write",
    expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // expire in 1 hour
  } satisfies IOauthServerAccessToken.ICreate;

  const accessToken: IOauthServerAccessToken =
    await api.functional.oauthServer.admin.accessTokens.create(connection, {
      body: accessTokenData,
    });
  typia.assert(accessToken);

  // Validations for data integrity and authorization
  TestValidator.equals(
    "OAuth client ID matches",
    accessToken.oauth_client_id,
    oauthClient.id,
  );
  TestValidator.equals(
    "Authorization code ID matches",
    accessToken.authorization_code_id,
    authorizationCode.id,
  );
  TestValidator.predicate(
    "Access token string length is 64",
    accessToken.token.length === 64,
  );
  TestValidator.equals("Access token scope", accessToken.scope, "read write");
  TestValidator.predicate(
    "Access token expiration date is in the future",
    new Date(accessToken.expires_at) > new Date(),
  );
}
