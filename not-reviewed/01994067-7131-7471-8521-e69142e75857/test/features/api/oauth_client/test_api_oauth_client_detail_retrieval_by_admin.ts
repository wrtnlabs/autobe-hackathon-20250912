import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * Validate OAuth client detail retrieval by an authenticated admin user.
 *
 * This test covers the full flow of:
 *
 * 1. Admin user creation and login
 * 2. OAuth client creation with specified properties
 * 3. Retrieval of the client detail by ID
 * 4. Validation that retrieved data matches creation data
 * 5. Unauthorized access attempt by unauthenticated connection
 * 6. Retrieval attempt with an invalid client ID
 *
 * It ensures security constraints and data integrity is enforced.
 */
export async function test_api_oauth_client_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user creation and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "AdminPass123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. OAuth client creation by the authenticated admin
  const oauthClientCreateData = {
    client_id: RandomGenerator.alphaNumeric(20),
    client_secret: RandomGenerator.alphaNumeric(40),
    redirect_uri: `https://${RandomGenerator.alphabets(10)}.com/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const createdOAuthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreateData,
    });
  typia.assert(createdOAuthClient);

  // 3. Retrieve OAuth client details by created id
  const retrievedClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.at(connection, {
      id: createdOAuthClient.id,
    });
  typia.assert(retrievedClient);

  // 4. Validate the retrieved client matches created data
  TestValidator.equals(
    "OAuth client ID should match",
    retrievedClient.id,
    createdOAuthClient.id,
  );
  TestValidator.equals(
    "OAuth client_id should match",
    retrievedClient.client_id,
    oauthClientCreateData.client_id,
  );
  TestValidator.equals(
    "OAuth client_secret should match",
    retrievedClient.client_secret,
    oauthClientCreateData.client_secret,
  );
  TestValidator.equals(
    "OAuth redirect_uri should match",
    retrievedClient.redirect_uri,
    oauthClientCreateData.redirect_uri,
  );
  TestValidator.equals(
    "OAuth logo_uri should be null",
    retrievedClient.logo_uri,
    null,
  );
  TestValidator.equals(
    "OAuth is_trusted flag should be true",
    retrievedClient.is_trusted,
    true,
  );

  // 5. Test unauthorized access (unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.oauthServer.admin.oauthClients.at(
      unauthenticatedConnection,
      {
        id: createdOAuthClient.id,
      },
    );
  });

  // 6. Test retrieval attempt with invalid client ID
  const invalidClientId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;

  await TestValidator.error(
    "invalid client ID should cause error",
    async () => {
      await api.functional.oauthServer.admin.oauthClients.at(connection, {
        id: invalidClientId,
      });
    },
  );
}
