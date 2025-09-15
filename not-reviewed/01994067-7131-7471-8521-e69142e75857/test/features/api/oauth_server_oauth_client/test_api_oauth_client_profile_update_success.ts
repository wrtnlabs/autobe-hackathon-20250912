import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

export async function test_api_oauth_client_profile_update_success(
  connection: api.IConnection,
) {
  // 1. Developer user join
  const developerCreateBody: IOauthServerDeveloper.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: false,
    password_hash: RandomGenerator.alphaNumeric(16),
  };
  const developerAuthorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developerAuthorized);

  // 2. Developer user login
  const developerLoginBody: IOauthServerDeveloper.ILogin = {
    email: developerCreateBody.email,
    password: developerCreateBody.password_hash,
  };
  const developerLoggedIn: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLoggedIn);

  // 3. OAuth client creation
  const oauthClientCreateBody: IOauthServerOauthClient.ICreate = {
    client_id: RandomGenerator.alphaNumeric(12),
    client_secret: RandomGenerator.alphaNumeric(24),
    redirect_uri: `https://app.example.com/callback/${RandomGenerator.alphaNumeric(8)}`,
    logo_uri: null,
    is_trusted: false,
  };
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 4. Client profile creation
  const clientProfileCreateBody: IOauthServerClientProfile.ICreate = {
    oauth_client_id: oauthClient.id,
    nickname: RandomGenerator.name(2),
    description: null,
  };
  const clientProfile: IOauthServerClientProfile =
    await api.functional.oauthServer.developer.oauthClients.clientProfiles.create(
      connection,
      {
        oauthClientId: oauthClient.id,
        body: clientProfileCreateBody,
      },
    );
  typia.assert(clientProfile);

  // 5. Client profile update
  const clientProfileUpdateBody: IOauthServerClientProfile.IUpdate = {
    nickname: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  };
  const updatedClientProfile: IOauthServerClientProfile =
    await api.functional.oauthServer.developer.oauthClients.clientProfiles.update(
      connection,
      {
        oauthClientId: oauthClient.id,
        id: clientProfile.id,
        body: clientProfileUpdateBody,
      },
    );
  typia.assert(updatedClientProfile);

  // 6. Validate update reflected
  TestValidator.equals(
    "updated nickname",
    updatedClientProfile.nickname,
    clientProfileUpdateBody.nickname,
  );
  TestValidator.equals(
    "updated description",
    updatedClientProfile.description,
    clientProfileUpdateBody.description,
  );
  TestValidator.equals(
    "profile id unchanged",
    updatedClientProfile.id,
    clientProfile.id,
  );
  TestValidator.equals(
    "profile oauth_client_id unchanged",
    updatedClientProfile.oauth_client_id,
    oauthClient.id,
  );
}
