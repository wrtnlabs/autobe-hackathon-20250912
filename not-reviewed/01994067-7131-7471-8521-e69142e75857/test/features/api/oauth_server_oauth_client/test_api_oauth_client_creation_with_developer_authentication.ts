import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * This E2E test validates the full lifecycle of OAuth client creation by a
 * developer user. It covers developer registration via join API, developer
 * login to obtain JWT tokens, then creation of an OAuth client with unique
 * credentials and metadata using the authorized developer connection.
 *
 * The test confirms successful client creation, verifies response data
 * fields, and enforces business rules such as client_id uniqueness and
 * role-based access control. It also includes negative tests for
 * unauthorized creation and duplicate client_id errors.
 */
export async function test_api_oauth_client_creation_with_developer_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new developer account
  const developerCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    email_verified: true,
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies IOauthServerDeveloper.ICreate;
  const developerAuthorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developerAuthorized);

  // 2. Log in with the created developer credentials
  const developerLoginBody = {
    email: developerCreateBody.email,
    password: developerCreateBody.password_hash,
  } satisfies IOauthServerDeveloper.ILogin;
  const loginAuthorized: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Create a new OAuth client with unique client_id
  const oauthClientCreateBody1 = {
    client_id: RandomGenerator.alphaNumeric(12),
    client_secret: RandomGenerator.alphaNumeric(24),
    redirect_uri: "https://example.com/oauth/callback",
    logo_uri: "https://example.com/logo.png",
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;
  const oauthClient1: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientCreateBody1,
    });
  typia.assert(oauthClient1);
  TestValidator.equals(
    "OAuth client IDs must match",
    oauthClient1.client_id,
    oauthClientCreateBody1.client_id,
  );
  TestValidator.equals(
    "OAuth client secrets must match",
    oauthClient1.client_secret,
    oauthClientCreateBody1.client_secret,
  );
  TestValidator.equals(
    "OAuth client redirect URIs must match",
    oauthClient1.redirect_uri,
    oauthClientCreateBody1.redirect_uri,
  );
  TestValidator.equals(
    "OAuth client logo URIs must match",
    oauthClient1.logo_uri,
    oauthClientCreateBody1.logo_uri,
  );
  TestValidator.equals(
    "OAuth client is_trusted flags must match",
    oauthClient1.is_trusted,
    oauthClientCreateBody1.is_trusted,
  );

  // 4. Negative test: Attempt to create OAuth client without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Client creation without authentication should fail",
    async () => {
      await api.functional.oauthServer.developer.oauthClients.create(
        unauthenticatedConnection,
        {
          body: {
            client_id: RandomGenerator.alphaNumeric(12),
            client_secret: RandomGenerator.alphaNumeric(24),
            redirect_uri: "https://unauth.example.com/callback",
            logo_uri: null,
            is_trusted: false,
          } satisfies IOauthServerOauthClient.ICreate,
        },
      );
    },
  );

  // 5. Negative test: Attempt to create OAuth client with duplicate client_id
  await TestValidator.error(
    "Client creation with duplicate client_id should fail",
    async () => {
      await api.functional.oauthServer.developer.oauthClients.create(
        connection,
        {
          body: {
            client_id: oauthClientCreateBody1.client_id,
            client_secret: RandomGenerator.alphaNumeric(24),
            redirect_uri: "https://example.com/duplicate/callback",
            logo_uri: null,
            is_trusted: false,
          } satisfies IOauthServerOauthClient.ICreate,
        },
      );
    },
  );
}
