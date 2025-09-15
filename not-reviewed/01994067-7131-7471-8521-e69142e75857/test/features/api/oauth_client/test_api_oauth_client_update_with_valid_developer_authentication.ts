import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * E2E Test for updating an OAuth client by authenticated developer user.
 *
 * This test covers full lifecycle: developer registration, authentication,
 * client creation, client update, and validation of update persistence.
 *
 * Includes negative cases for invalid client ID and unauthorized update.
 */
export async function test_api_oauth_client_update_with_valid_developer_authentication(
  connection: api.IConnection,
) {
  // 1. Developer registration
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = "TestPassword123!";
  const developerCreateBody = {
    email: developerEmail,
    email_verified: true,
    password_hash: developerPassword,
  } satisfies IOauthServerDeveloper.ICreate;

  const developerAuthorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developerAuthorized);

  // 2. Developer login
  const developerLoginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies IOauthServerDeveloper.ILogin;

  const developerLoginAuthorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLoginAuthorized);

  // 3. Create initial OAuth client
  const createClientBody = {
    client_id: RandomGenerator.alphaNumeric(15),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://${RandomGenerator.alphaNumeric(10)}.com/callback`,
    logo_uri: `https://${RandomGenerator.alphaNumeric(8)}.com/logo.png`,
    is_trusted: false,
  } satisfies IOauthServerOauthClient.ICreate;

  const createdClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: createClientBody,
    });
  typia.assert(createdClient);

  TestValidator.equals(
    "created client client_id matches input",
    createdClient.client_id,
    createClientBody.client_id,
  );

  // 4. Update the OAuth client
  const updateClientBody = {
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://${RandomGenerator.alphaNumeric(12)}.org/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.IUpdate;

  const updatedClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.update(connection, {
      id: createdClient.id,
      body: updateClientBody,
    });
  typia.assert(updatedClient);

  TestValidator.equals(
    "updated client id matches original",
    updatedClient.id,
    createdClient.id,
  );
  TestValidator.equals(
    "updated client client_id preserved",
    updatedClient.client_id,
    createdClient.client_id,
  );
  TestValidator.equals(
    "updated client_secret updated",
    updatedClient.client_secret,
    updateClientBody.client_secret,
  );
  TestValidator.equals(
    "updated redirect_uri updated",
    updatedClient.redirect_uri,
    updateClientBody.redirect_uri,
  );
  TestValidator.equals(
    "updated logo_uri updated to null",
    updatedClient.logo_uri,
    updateClientBody.logo_uri,
  );
  TestValidator.equals(
    "updated is_trusted updated",
    updatedClient.is_trusted,
    updateClientBody.is_trusted,
  );
  TestValidator.predicate(
    "updated created_at timestamp stays the same",
    updatedClient.created_at === createdClient.created_at,
  );
  TestValidator.predicate(
    "updated updated_at timestamp is recent",
    new Date(updatedClient.updated_at).getTime() >
      new Date(createdClient.updated_at).getTime(),
  );

  // 5. Retrieve the updated client to validate persistence
  const reloadedClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.at(connection, {
      id: createdClient.id,
    });
  typia.assert(reloadedClient);

  TestValidator.equals(
    "reloaded client matches update",
    reloadedClient,
    updatedClient,
  );

  // 6. Negative test - update with invalid ID format
  await TestValidator.error(
    "update fails with invalid UUID format",
    async () => {
      await api.functional.oauthServer.developer.oauthClients.update(
        connection,
        {
          id: "invalid-uuid-format",
          body: updateClientBody,
        },
      );
    },
  );

  // 7. Negative test - unauthorized update attempt
  // Prepare unauthenticated connection
  const unauthenticatedConnection = { ...connection, headers: {} };

  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.oauthServer.developer.oauthClients.update(
      unauthenticatedConnection,
      {
        id: createdClient.id,
        body: updateClientBody,
      },
    );
  });
}
