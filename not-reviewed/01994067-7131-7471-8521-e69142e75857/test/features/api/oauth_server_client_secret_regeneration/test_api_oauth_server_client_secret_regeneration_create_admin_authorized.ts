import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * This test validates the creation of an OAuth server client secret
 * regeneration record. It performs the following steps:
 *
 * 1. Creates and authenticates an admin user.
 * 2. Creates an OAuth client.
 * 3. Creates a client secret regeneration record referencing the admin and client.
 * 4. Asserts the returned data matches the input and follows type constraints.
 */
export async function test_api_oauth_server_client_secret_regeneration_create_admin_authorized(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "SecureP@ssw0rd123",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create OAuth client
  const newClientBody = {
    client_id: RandomGenerator.alphaNumeric(12),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://redirect.example.com/callback/${RandomGenerator.alphaNumeric(8)}`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: newClientBody,
    });
  typia.assert(oauthClient);

  // 3. Create client secret regeneration record
  const now = new Date().toISOString();
  const secretRegenCreate = {
    oauth_client_id: oauthClient.id,
    admin_id: admin.id,
    regenerated_at: now,
    reason: `Automated secret regeneration scenario at ${now}`,
  } satisfies IOauthServerClientSecretRegeneration.ICreate;

  const secretRegeneration: IOauthServerClientSecretRegeneration =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.create(
      connection,
      {
        body: secretRegenCreate,
      },
    );
  typia.assert(secretRegeneration);

  // Validate response matches creation data for client_id, admin_id and regenerated_at
  TestValidator.equals(
    "oauth_client_id should match input",
    secretRegeneration.oauth_client_id,
    secretRegenCreate.oauth_client_id,
  );
  TestValidator.equals(
    "admin_id should match input",
    secretRegeneration.admin_id,
    secretRegenCreate.admin_id,
  );
  TestValidator.equals(
    "regenerated_at should match input",
    secretRegeneration.regenerated_at,
    secretRegenCreate.regenerated_at,
  );

  // Validate reason property matches or is null if input null
  TestValidator.equals(
    "reason should match input",
    secretRegeneration.reason ?? null,
    secretRegenCreate.reason ?? null,
  );
}
