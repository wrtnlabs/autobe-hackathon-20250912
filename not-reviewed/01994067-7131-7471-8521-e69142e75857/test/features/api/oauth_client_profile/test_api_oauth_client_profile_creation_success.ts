import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * This e2e test verifies the successful creation of an OAuth client profile for
 * a given OAuth client by an authenticated developer.
 *
 * The test covers the full flow:
 *
 * 1. Developer register
 * 2. Developer login
 * 3. OAuth client creation
 * 4. OAuth client profile creation
 *
 * Verification includes matching client IDs and typia assertion of all
 * responses.
 */
export async function test_api_oauth_client_profile_creation_success(
  connection: api.IConnection,
) {
  // 1. Register developer user
  const developerEmail =
    RandomGenerator.alphaNumeric(10).toLowerCase() + "@test.example.com";
  const developerPassword = "P@ssw0rd123";
  const developerAuthorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: developerPassword,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developerAuthorized);

  // 2. Login as developer
  const loginAuthorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: developerPassword,
      } satisfies IOauthServerDeveloper.ILogin,
    });
  typia.assert(loginAuthorized);

  // 3. Create OAuth client
  const oauthClientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(15),
    client_secret: RandomGenerator.alphaNumeric(30),
    redirect_uri: "https://example.com/oauth/callback",
    logo_uri: null,
    is_trusted: false,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 4. Create client profile for the OAuth client
  const clientProfileCreateBody = {
    oauth_client_id: oauthClient.id,
    nickname: "TestClientProfile",
    description: "This is a test OAuth client profile.",
  } satisfies IOauthServerClientProfile.ICreate;

  const clientProfile: IOauthServerClientProfile =
    await api.functional.oauthServer.developer.oauthClients.clientProfiles.create(
      connection,
      {
        oauthClientId: oauthClient.id,
        body: clientProfileCreateBody,
      },
    );
  typia.assert(clientProfile);

  TestValidator.equals(
    "OAuth client ID matches in client profile",
    clientProfile.oauth_client_id,
    oauthClient.id,
  );
}
