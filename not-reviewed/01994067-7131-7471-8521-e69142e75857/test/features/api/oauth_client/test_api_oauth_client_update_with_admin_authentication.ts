import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * This test verifies the admin OAuth client update workflow, including admin
 * user registration, login, OAuth client creation, update with changed fields,
 * validation, unauthorized attempts, and invalid update data error handling.
 */
export async function test_api_oauth_client_update_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminUser: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Admin user login
  const login: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(login);

  // 3. Create OAuth client
  // Generate a unique client_id
  const clientId = RandomGenerator.alphaNumeric(24);
  const clientSecret = RandomGenerator.alphaNumeric(32);
  const redirectUri = `https://${RandomGenerator.name(2).replace(/\s+/g, "")}.example.com/callback`;
  const logoUri = `https://cdn.example.com/logos/${RandomGenerator.alphaNumeric(12)}.png`;
  const isTrusted = true;

  const createdClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        logo_uri: logoUri,
        is_trusted: isTrusted,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(createdClient);
  TestValidator.equals(
    "client_id unchanged after create",
    createdClient.client_id,
    clientId,
  );

  // 4. Update OAuth client (mutable fields only)
  const newClientSecret = RandomGenerator.alphaNumeric(32);
  const newRedirectUri = `https://${RandomGenerator.name(2).replace(/\s+/g, "")}.example.org/callback`;
  const newLogoUri = null; // explicit null
  const newIsTrusted = false;

  const updatedClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.update(connection, {
      id: createdClient.id,
      body: {
        client_secret: newClientSecret,
        redirect_uri: newRedirectUri,
        logo_uri: newLogoUri,
        is_trusted: newIsTrusted,
      } satisfies IOauthServerOauthClient.IUpdate,
    });
  typia.assert(updatedClient);

  // Validate updated fields
  TestValidator.equals(
    "client_id unchanged after update",
    updatedClient.client_id,
    clientId,
  );
  TestValidator.equals(
    "client_secret updated correctly",
    updatedClient.client_secret,
    newClientSecret,
  );
  TestValidator.equals(
    "redirect_uri updated correctly",
    updatedClient.redirect_uri,
    newRedirectUri,
  );
  TestValidator.equals(
    "logo_uri updated to null",
    updatedClient.logo_uri,
    null,
  );
  TestValidator.equals(
    "is_trusted updated correctly",
    updatedClient.is_trusted,
    newIsTrusted,
  );

  // 5. Unauthorized update attempt
  // Create new connection without authentication tokens (empty headers object)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthClients.update(
        unauthenticatedConnection,
        {
          id: createdClient.id,
          body: {
            client_secret: RandomGenerator.alphaNumeric(32),
          } satisfies IOauthServerOauthClient.IUpdate,
        },
      );
    },
  );

  // 6. Invalid update data scenarios
  // (a) Invalid redirect_uri - malformed URI string
  await TestValidator.error(
    "update with invalid redirect_uri should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthClients.update(connection, {
        id: createdClient.id,
        body: {
          redirect_uri: "invalid_uri",
        } satisfies IOauthServerOauthClient.IUpdate,
      });
    },
  );

  // (b) Empty client_secret (empty string) - invalid business logic
  await TestValidator.error(
    "update with empty client_secret should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthClients.update(connection, {
        id: createdClient.id,
        body: {
          client_secret: "",
        } satisfies IOauthServerOauthClient.IUpdate,
      });
    },
  );

  // (c) Update with no fields (empty body) should succeed and not change anything
  // This tests that empty update body is allowed and leaves client unchanged.
  const unchangedClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.update(connection, {
      id: createdClient.id,
      body: {},
    });
  typia.assert(unchangedClient);

  // Validate client_id and other fields unchanged
  TestValidator.equals(
    "client_id unchanged after empty update",
    unchangedClient.client_id,
    clientId,
  );
  TestValidator.equals(
    "client_secret unchanged after empty update",
    unchangedClient.client_secret,
    updatedClient.client_secret,
  );
  TestValidator.equals(
    "redirect_uri unchanged after empty update",
    unchangedClient.redirect_uri,
    updatedClient.redirect_uri,
  );
  TestValidator.equals(
    "logo_uri unchanged after empty update",
    unchangedClient.logo_uri,
    updatedClient.logo_uri,
  );
  TestValidator.equals(
    "is_trusted unchanged after empty update",
    unchangedClient.is_trusted,
    updatedClient.is_trusted,
  );
}
