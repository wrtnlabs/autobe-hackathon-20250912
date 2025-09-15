import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

export async function test_api_access_token_retrieval_by_id_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "P@ssw0rd123",
  } satisfies IOauthServerAdmin.ICreate;
  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Login admin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IOauthServerAdmin.ILogin;
  const loggedInAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. Create OAuth client
  const oauthClientBody = {
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://${RandomGenerator.alphabets(8)}.com/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;
  const createdOauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientBody,
    });
  typia.assert(createdOauthClient);

  // 4. Create OAuth access token linked to the client
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours later
  const accessTokenBody = {
    oauth_client_id: createdOauthClient.id,
    authorization_code_id: null,
    token: RandomGenerator.alphaNumeric(64),
    scope: "read write",
    expires_at: expiresAt.toISOString(),
  } satisfies IOauthServerAccessToken.ICreate;
  const createdAccessToken: IOauthServerAccessToken =
    await api.functional.oauthServer.admin.accessTokens.create(connection, {
      body: accessTokenBody,
    });
  typia.assert(createdAccessToken);

  // 5. Retrieve the access token by ID using authenticated connection
  const readAccessToken: IOauthServerAccessToken =
    await api.functional.oauthServer.admin.accessTokens.at(connection, {
      id: createdAccessToken.id,
    });
  typia.assert(readAccessToken);

  // Validate that the read token matches the created token
  TestValidator.equals(
    "Read access token matches created token",
    readAccessToken,
    createdAccessToken,
  );

  // 6. Attempt to read with an unauthenticated connection - expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Access token retrieval without admin authentication should fail",
    async () => {
      await api.functional.oauthServer.admin.accessTokens.at(unauthConn, {
        id: createdAccessToken.id,
      });
    },
  );

  // 7. Attempt to read a non-existent access token by random UUID - expect error
  await TestValidator.error(
    "Access token retrieval with non-existent ID should fail",
    async () => {
      await api.functional.oauthServer.admin.accessTokens.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
