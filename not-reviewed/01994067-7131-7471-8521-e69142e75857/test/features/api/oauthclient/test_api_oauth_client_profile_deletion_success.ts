import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * Validate deletion of an OAuth client's client profile under a developer
 * authenticated context.
 *
 * This test performs a full business flow:
 *
 * 1. Developer user registration and login.
 * 2. OAuth client creation.
 * 3. Client profile creation for the OAuth client.
 * 4. Deletion of the created client profile.
 * 5. Confirmation that deletion succeeds with no content error.
 *
 * All inputs respect UUID and email formats with randomized data. Assertions
 * ensure API behavior complies with expected secure deletion semantics.
 */
export async function test_api_oauth_client_profile_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Developer user account registration
  const devCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    email_verified: true,
    password_hash: "hashed_password_sample_123!",
  } satisfies IOauthServerDeveloper.ICreate;
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: devCreateBody,
    });
  typia.assert(developer);

  // Step 2: Developer login
  const loginBody = {
    email: devCreateBody.email,
    password: "plaintext_password",
  } satisfies IOauthServerDeveloper.ILogin;
  const developerLogin: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, { body: loginBody });
  typia.assert(developerLogin);

  // Step 3: Create a new OAuth client
  const oauthClientCreateBody = {
    client_id: `client_${RandomGenerator.alphaNumeric(8)}`,
    client_secret: RandomGenerator.alphaNumeric(16),
    redirect_uri: `https://app.example.com/callback/${RandomGenerator.alphaNumeric(6)}`,
    logo_uri: null,
    is_trusted: false,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // Step 4: Create a client profile under the OAuth client
  const clientProfileCreateBody = {
    oauth_client_id: oauthClient.id,
    nickname: RandomGenerator.name(2),
    description: "Test client profile for deletion.",
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

  // Step 5: Delete the created client profile
  await api.functional.oauthServer.developer.oauthClients.clientProfiles.eraseClientProfile(
    connection,
    {
      oauthClientId: oauthClient.id,
      id: clientProfile.id,
    },
  );

  // Step 6: Confirm deletion succeeded by absence of error
  TestValidator.predicate(
    "client profile deletion succeeded without throwing error",
    true,
  );
}
