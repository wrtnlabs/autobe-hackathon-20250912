import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * E2E test scenario verifying OAuth client detail retrieval for developer
 * users
 *
 * This test covers the following steps:
 *
 * 1. Register a new developer with unique email, email_verified set true, and
 *    password hash.
 * 2. Login as that developer to obtain authorization tokens.
 * 3. Create a new OAuth client associated with the developer with all required
 *    fields.
 * 4. Retrieve the OAuth client by ID and validate returned data matches
 *    creation data.
 * 5. Ensure that unauthenticated access to client retrieval returns an
 *    authorization error.
 * 6. Test retrieving a non-existent OAuth client ID returns an appropriate
 *    failure.
 *
 * Test ensures strict enforcement of developer authentication, data
 * correctness, and proper error handling in the OAuth client retrieval
 * API.
 */
export async function test_api_oauth_client_retrieval_with_developer_authentication(
  connection: api.IConnection,
) {
  // 1. Register developer user
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  // Use fixed plaintext password
  const plaintextPassword: string = "TestPa55word!";
  // For test purposes, server expects 'password_hash' as whatever is sent in body
  const developerCreateBody = {
    email: developerEmail,
    email_verified: true,
    password_hash: plaintextPassword,
  } satisfies IOauthServerDeveloper.ICreate;
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developer);

  // 2. Login developer user to set auth token
  const developerLoginBody = {
    email: developerEmail,
    password: plaintextPassword,
  } satisfies IOauthServerDeveloper.ILogin;
  const developerAuth: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerAuth);

  // 3. Create OAuth client
  const createClientBody = {
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://example.com/callback/${RandomGenerator.alphaNumeric(8)}`,
    logo_uri: `https://example.com/logo/${RandomGenerator.alphaNumeric(5)}.png`,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;
  const createdClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: createClientBody,
    });
  typia.assert(createdClient);

  // 4. Retrieve OAuth client by ID
  const retrievedClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.at(connection, {
      id: createdClient.id,
    });
  typia.assert(retrievedClient);

  // Validate retrieved data matches created data
  TestValidator.equals(
    "OAuth Client retrieval: client_id matches created",
    retrievedClient.client_id,
    createClientBody.client_id,
  );
  TestValidator.equals(
    "OAuth Client retrieval: client_secret matches created",
    retrievedClient.client_secret,
    createClientBody.client_secret,
  );
  TestValidator.equals(
    "OAuth Client retrieval: redirect_uri matches created",
    retrievedClient.redirect_uri,
    createClientBody.redirect_uri,
  );
  TestValidator.equals(
    "OAuth Client retrieval: is_trusted flag matches created",
    retrievedClient.is_trusted,
    createClientBody.is_trusted,
  );
  TestValidator.equals(
    "OAuth Client retrieval: logo_uri matches created",
    retrievedClient.logo_uri,
    createClientBody.logo_uri,
  );

  // Validate timestamps exist (created_at, updated_at) and deleted_at is null
  TestValidator.predicate(
    "OAuth Client retrieval: created_at exists and is non-empty string",
    typeof retrievedClient.created_at === "string" &&
      retrievedClient.created_at.length > 0,
  );
  TestValidator.predicate(
    "OAuth Client retrieval: updated_at exists and is non-empty string",
    typeof retrievedClient.updated_at === "string" &&
      retrievedClient.updated_at.length > 0,
  );
  TestValidator.equals(
    "OAuth Client retrieval: deleted_at is null",
    retrievedClient.deleted_at,
    null,
  );

  // 5. Test unauthorized access: create unauthenticated connection (empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "OAuth Client unauthorized retrieval should fail",
    async () => {
      await api.functional.oauthServer.developer.oauthClients.at(
        unauthConnection,
        { id: createdClient.id },
      );
    },
  );

  // 6. Test retrieval of non-existent OAuth client fails
  await TestValidator.error(
    "OAuth Client retrieval of non-existent client should fail",
    async () => {
      await api.functional.oauthServer.developer.oauthClients.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(), // random UUID unlikely to exist
      });
    },
  );
}
