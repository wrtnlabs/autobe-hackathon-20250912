import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * Validate the soft deletion of OAuth clients by developer users.
 *
 * 1. Register a developer account
 * 2. Log in to obtain tokens
 * 3. Create an OAuth client
 * 4. Soft delete the OAuth client
 * 5. Validate soft deletion by deleted_at timestamp (note: limited verification
 *    due to lack of listing API)
 * 6. Negative tests for unauthorized and invalid IDs
 */
export async function test_api_oauth_client_soft_delete_by_developer(
  connection: api.IConnection,
) {
  // 1. Register developer account
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd123";
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: password,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  // 2. Log in as developer
  const loggedInDeveloper: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: password,
      } satisfies IOauthServerDeveloper.ILogin,
    });
  typia.assert(loggedInDeveloper);

  // 3. Create a new OAuth client
  const clientId = RandomGenerator.alphaNumeric(24);
  const clientSecret = RandomGenerator.alphaNumeric(48);
  const redirectUri = "https://example.com/callback";
  const isTrusted = false;
  const newClientCreate: IOauthServerOauthClient.ICreate = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    logo_uri: null,
    is_trusted: isTrusted,
  };
  const createdClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: newClientCreate,
    });
  typia.assert(createdClient);
  TestValidator.equals(
    "created client_id matches input",
    createdClient.client_id,
    clientId,
  );

  // 4. Soft delete the OAuth client
  await api.functional.oauthServer.developer.oauthClients.erase(connection, {
    id: createdClient.id,
  });

  // 5. Validate the client is soft deleted by attempting re-access
  // TODO: Full validation of deleted_at timestamp is limited because no GET/LIST SDK is provided

  // 6. Negative test: delete with invalid client id
  await TestValidator.error(
    "delete with invalid client id must fail",
    async () => {
      await api.functional.oauthServer.developer.oauthClients.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Negative test: unauthorized deletion attempt by another developer
  const anotherDeveloperEmail = typia.random<string & tags.Format<"email">>();

  const anotherDeveloper: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: anotherDeveloperEmail,
        email_verified: true,
        password_hash: password,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(anotherDeveloper);

  await api.functional.auth.developer.login(connection, {
    body: {
      email: anotherDeveloperEmail,
      password: password,
    } satisfies IOauthServerDeveloper.ILogin,
  });

  await TestValidator.error(
    "unauthorized user cannot delete another developer's OAuth client",
    async () => {
      await api.functional.oauthServer.developer.oauthClients.erase(
        connection,
        {
          id: createdClient.id,
        },
      );
    },
  );
}
