import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

export async function test_api_oauth_client_soft_delete_by_admin_with_auth(
  connection: api.IConnection,
) {
  // 1. Register a new admin user via /auth/admin/join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);

  const adminUser = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      email_verified: true,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ICreate,
  });
  typia.assert(adminUser);

  // 2. Login as the admin user to refresh token (SDK auto manages token)
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create an OAuth client
  const clientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(12),
    client_secret: RandomGenerator.alphaNumeric(24),
    redirect_uri: `https://example.com/callback/${RandomGenerator.alphaNumeric(8)}`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const createdClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: clientCreateBody,
    });
  typia.assert(createdClient);

  // 4. Soft delete the created OAuth client by ID
  await api.functional.oauthServer.admin.oauthClients.erase(connection, {
    id: createdClient.id,
  });

  // 5. Confirm soft deletion: attempt to delete again, expecting an error
  await TestValidator.error("soft delete repeated should fail", async () => {
    await api.functional.oauthServer.admin.oauthClients.erase(connection, {
      id: createdClient.id,
    });
  });

  // 6. Check unauthorized deletion attempt using unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized user cannot delete OAuth client",
    async () => {
      await api.functional.oauthServer.admin.oauthClients.erase(
        unauthenticatedConnection,
        {
          id: createdClient.id,
        },
      );
    },
  );
}
