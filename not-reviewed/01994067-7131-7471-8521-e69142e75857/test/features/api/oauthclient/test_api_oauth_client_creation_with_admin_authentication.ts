import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * This e2e test scenario verifies the complete workflow for creating an OAuth
 * client through the administrative interface. It starts by registering an
 * admin user account using the admin join API, authenticates the admin by
 * logging in to retrieve valid JWT tokens necessary for authorization. Then,
 * using the authorized admin context, it creates a new OAuth client with
 * required information including unique client_id, client_secret, valid
 * redirect URI, and optional fields such as logo URI and trust flag. The
 * scenario validates that the client creation succeeds and all returned client
 * properties, including timestamps, are correctly populated. It also verifies
 * business rules such as uniqueness of client_id, proper management of
 * security-sensitive data like client secrets, and that only admin users can
 * create OAuth clients. Error scenarios include attempts to create clients with
 * duplicate client_id or unauthorized roles, which should return appropriate
 * HTTP error responses.
 */
export async function test_api_oauth_client_creation_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPass1234";
  const adminCreateBody = {
    email: adminEmail,
    email_verified: true,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ICreate;
  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Login as admin
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLogin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Step 3: Create OAuth client with admin authorization
  const clientId = "client_" + RandomGenerator.alphaNumeric(10);
  const clientSecret = RandomGenerator.alphaNumeric(32);
  const redirectUri = "https://callback.example.com/oauth2/callback";

  const oauthClientCreateBody = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    logo_uri: "https://cdn.example.com/logo.png",
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });

  typia.assert(oauthClient);

  TestValidator.equals("client_id matches", oauthClient.client_id, clientId);
  TestValidator.equals(
    "client_secret matches",
    oauthClient.client_secret,
    clientSecret,
  );
  TestValidator.equals(
    "redirect_uri matches",
    oauthClient.redirect_uri,
    redirectUri,
  );
  TestValidator.equals(
    "logo_uri matches",
    oauthClient.logo_uri ?? null,
    "https://cdn.example.com/logo.png",
  );
  TestValidator.equals("is_trusted matches", oauthClient.is_trusted, true);

  // Step 4: Test error on duplicate client_id
  await TestValidator.error("duplicate client_id should fail", async () => {
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: {
        client_id: clientId,
        client_secret: RandomGenerator.alphaNumeric(32),
        redirect_uri: redirectUri,
        is_trusted: false,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  });

  // Step 5: Test unauthorized access
  // Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized client creation should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthClients.create(unauthConn, {
        body: {
          client_id: "unauth_client",
          client_secret: RandomGenerator.alphaNumeric(32),
          redirect_uri: "https://example.org/callback",
          is_trusted: false,
        } satisfies IOauthServerOauthClient.ICreate,
      });
    },
  );
}
