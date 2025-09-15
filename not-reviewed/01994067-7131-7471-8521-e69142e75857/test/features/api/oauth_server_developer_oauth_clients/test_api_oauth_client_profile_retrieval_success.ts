import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

export async function test_api_oauth_client_profile_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Generate developer user registration data and password
  const password = RandomGenerator.alphaNumeric(20);
  const email = typia.random<string & tags.Format<"email">>();

  // 2. Developer user registration (join)
  const developerCreated: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email,
        email_verified: true,
        password_hash: password,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developerCreated);

  // 3. Developer user login
  const developerLoggedIn: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email,
        password,
      } satisfies IOauthServerDeveloper.ILogin,
    });
  typia.assert(developerLoggedIn);

  // 4. Create a new OAuth client
  const oauthClientCreated: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: {
        client_id: RandomGenerator.alphaNumeric(10),
        client_secret: RandomGenerator.alphaNumeric(30),
        redirect_uri: "https://example.com/oauth/callback",
        logo_uri: null,
        is_trusted: false,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(oauthClientCreated);

  // 5. Create a new client profile for the created OAuth client
  const clientProfileCreated: IOauthServerClientProfile =
    await api.functional.oauthServer.developer.oauthClients.clientProfiles.create(
      connection,
      {
        oauthClientId: oauthClientCreated.id,
        body: {
          oauth_client_id: oauthClientCreated.id,
          nickname: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IOauthServerClientProfile.ICreate,
      },
    );
  typia.assert(clientProfileCreated);

  // 6. Retrieve the created client profile
  const clientProfileRetrieved: IOauthServerClientProfile =
    await api.functional.oauthServer.developer.oauthClients.clientProfiles.at(
      connection,
      {
        oauthClientId: oauthClientCreated.id,
        id: clientProfileCreated.id,
      },
    );
  typia.assert(clientProfileRetrieved);

  // 7. Validate that retrieved profile matches created profile
  TestValidator.equals(
    "OAuth client profile id",
    clientProfileRetrieved.id,
    clientProfileCreated.id,
  );
  TestValidator.equals(
    "OAuth client profile oauth_client_id",
    clientProfileRetrieved.oauth_client_id,
    clientProfileCreated.oauth_client_id,
  );
  TestValidator.equals(
    "OAuth client profile nickname",
    clientProfileRetrieved.nickname,
    clientProfileCreated.nickname,
  );
  TestValidator.equals(
    "OAuth client profile description",
    clientProfileRetrieved.description,
    clientProfileCreated.description,
  );
  TestValidator.equals(
    "OAuth client profile created_at",
    clientProfileRetrieved.created_at,
    clientProfileCreated.created_at,
  );
  TestValidator.equals(
    "OAuth client profile updated_at",
    clientProfileRetrieved.updated_at,
    clientProfileCreated.updated_at,
  );
}
