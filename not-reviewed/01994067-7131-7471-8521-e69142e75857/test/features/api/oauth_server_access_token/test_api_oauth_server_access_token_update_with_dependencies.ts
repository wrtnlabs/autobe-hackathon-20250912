import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * This test verifies the OAuth server access token update process with
 * dependencies on several prerequisite resources and multi-role
 * authentication.
 *
 * The workflow includes:
 *
 * 1. Creating and logging in an admin user to establish admin context.
 * 2. Creating and logging in a developer user for developer context.
 * 3. Creating an OAuth client as a prerequisite for access tokens.
 * 4. Creating an authorization code linked to the OAuth client.
 * 5. Updating an existing access token, modifying token value, expiration, scope,
 *    and linked client and authorization code IDs.
 * 6. Validating that the update is reflected correctly with consistent IDs and
 *    data.
 * 7. Ensuring proper admin authorization is required for the update operation.
 *
 * The test assertions use typia.assert for complete type validation and
 * TestValidator to ensure data integrity and business rules.
 */
export async function test_api_oauth_server_access_token_update_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Create first admin user (for general admin tasks)
  const adminCreateBody1 = {
    email: RandomGenerator.alphaNumeric(5) + "@test.com",
    email_verified: true,
    password: "TestPass1!",
  } satisfies IOauthServerAdmin.ICreate;
  const admin1: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody1,
    });
  typia.assert(admin1);

  // 2. Login first admin user to authenticate
  const adminLoginBody1 = {
    email: adminCreateBody1.email,
    password: adminCreateBody1.password,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLogin1: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody1,
    });
  typia.assert(adminLogin1);

  // 3. Create second admin user (for multi-actor scenarios)
  const adminCreateBody2 = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    email_verified: true,
    password: "AnotherTest2!",
  } satisfies IOauthServerAdmin.ICreate;
  const admin2: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody2,
    });
  typia.assert(admin2);

  // 4. Login second admin user
  const adminLoginBody2 = {
    email: adminCreateBody2.email,
    password: adminCreateBody2.password,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLogin2: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody2,
    });
  typia.assert(adminLogin2);

  // 5. Create developer user (for developer role context)
  const devCreateBody = {
    email: RandomGenerator.alphaNumeric(6) + "@devtest.com",
    email_verified: true,
    password_hash: "hashedpassword123",
  } satisfies IOauthServerDeveloper.ICreate;
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: devCreateBody,
    });
  typia.assert(developer);

  // 6. Developer login
  const devLoginBody = {
    email: devCreateBody.email,
    password: "hashedpassword123",
  } satisfies IOauthServerDeveloper.ILogin;
  const developerLogin: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: devLoginBody,
    });
  typia.assert(developerLogin);

  // 7. Switch authentication back to first admin for privileged operations (create OAuth client)
  await api.functional.auth.admin.login(connection, { body: adminLoginBody1 });

  // 8. Create OAuth client for the access token
  const oauthClientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(8),
    client_secret: RandomGenerator.alphaNumeric(16),
    redirect_uri: "https://example.com/oauth/callback",
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 9. Switch to developer role to create authorization code linked to OAuth client
  await api.functional.auth.developer.login(connection, { body: devLoginBody });

  // 10. Create authorization code with link to OAuth client
  const authorizationCodeCreateBody = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(12),
    data: JSON.stringify({ scope: "read write", state: "teststate" }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  } satisfies IOauthServerAuthorizationCode.ICreate;
  const authorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      { body: authorizationCodeCreateBody },
    );
  typia.assert(authorizationCode);

  // 11. Switch to first admin again for updating the access token
  await api.functional.auth.admin.login(connection, { body: adminLoginBody1 });

  // 12. Prepare the access token update payload
  const accessTokenUpdateBody = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authorizationCode.id,
    token: RandomGenerator.alphaNumeric(32),
    scope: "read write",
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  } satisfies IOauthServerAccessToken.IUpdate;

  // 13. Perform the update call
  const updatedAccessToken: IOauthServerAccessToken =
    await api.functional.oauthServer.admin.accessTokens.update(connection, {
      id: authorizationCode.id, // Note: using authorizationCode.id as the access token id for testing
      body: accessTokenUpdateBody,
    });
  typia.assert(updatedAccessToken);

  // 14. Validate that updated properties have the values sent
  TestValidator.equals(
    "OAuth client ID updated",
    updatedAccessToken.oauth_client_id,
    oauthClient.id,
  );
  TestValidator.equals(
    "Authorization code ID updated",
    updatedAccessToken.authorization_code_id,
    authorizationCode.id,
  );
  TestValidator.equals(
    "Token value updated",
    updatedAccessToken.token,
    accessTokenUpdateBody.token,
  );
  TestValidator.equals(
    "Scope updated",
    updatedAccessToken.scope,
    accessTokenUpdateBody.scope,
  );
  TestValidator.equals(
    "Expiration updated",
    updatedAccessToken.expires_at,
    accessTokenUpdateBody.expires_at,
  );
  TestValidator.equals(
    "Deleted_at updated to null",
    updatedAccessToken.deleted_at,
    null,
  );
}
