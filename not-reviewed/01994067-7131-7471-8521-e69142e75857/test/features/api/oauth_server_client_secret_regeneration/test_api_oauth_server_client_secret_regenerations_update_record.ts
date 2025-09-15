import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * This test validates that an existing OAuth Server client secret regeneration
 * record can be updated correctly by an authenticated admin user. It performs
 * end-to-end testing of the update operation, including prerequisite steps for
 * authentication and resource creation.
 *
 * The test workflow is:
 *
 * 1. Create and authenticate an admin user.
 * 2. Create a new OAuth client for association.
 * 3. Create a client secret regeneration record tied to the created client and
 *    admin.
 * 4. Update the 'reason' field in the regeneration record.
 * 5. Verify the update is applied correctly and immutable fields remain unchanged.
 * 6. Confirm that unauthorized users are denied access to the update operation.
 */
export async function test_api_oauth_server_client_secret_regenerations_update_record(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "SecurePassword123!",
  } satisfies IOauthServerAdmin.ICreate;
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Login as admin to establish authentication context (token updated internally)
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLogged: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogged);

  // 2. Create an OAuth client
  const oauthClientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: "https://example.com/callback",
    logo_uri: null,
    is_trusted: false,
  } satisfies IOauthServerOauthClient.ICreate;
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 3. Create a client secret regeneration record
  const nowISOString = new Date().toISOString();
  const secretRegenCreateBody = {
    oauth_client_id: oauthClient.id,
    admin_id: admin.id,
    regenerated_at: nowISOString,
    reason: "Initial secret regeneration for testing",
  } satisfies IOauthServerClientSecretRegeneration.ICreate;
  const secretRegen: IOauthServerClientSecretRegeneration =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.create(
      connection,
      { body: secretRegenCreateBody },
    );
  typia.assert(secretRegen);

  // 4. Update the secret regeneration record - modify the 'reason' field
  const updatedReason = "Updated reason: security review update";
  const secretRegenUpdateBody = {
    reason: updatedReason,
  } satisfies IOauthServerClientSecretRegeneration.IUpdate;

  const updatedSecretRegen: IOauthServerClientSecretRegeneration =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.updateSecretRegenerationRecord(
      connection,
      {
        id: secretRegen.id,
        body: secretRegenUpdateBody,
      },
    );
  typia.assert(updatedSecretRegen);

  // 5. Verify updated record has changed reason and other immutable fields remain unchanged
  TestValidator.equals(
    "Updated reason field is reflected",
    updatedSecretRegen.reason,
    updatedReason,
  );
  TestValidator.equals(
    "IDs remain unchanged",
    updatedSecretRegen.id,
    secretRegen.id,
  );
  TestValidator.equals(
    "OAuth client association remains unchanged",
    updatedSecretRegen.oauth_client_id,
    secretRegen.oauth_client_id,
  );
  TestValidator.equals(
    "Admin association remains unchanged",
    updatedSecretRegen.admin_id,
    secretRegen.admin_id,
  );
  TestValidator.equals(
    "Regeneration timestamp remains unchanged",
    updatedSecretRegen.regenerated_at,
    secretRegen.regenerated_at,
  );
  TestValidator.equals(
    "Creation timestamp remains unchanged",
    updatedSecretRegen.created_at,
    secretRegen.created_at,
  );
  TestValidator.equals(
    "Deletion timestamp remains unchanged",
    updatedSecretRegen.deleted_at ?? null,
    secretRegen.deleted_at ?? null,
  );

  // 6. Verify unauthorized user cannot update the record
  // Simulate unauthenticated connection by cloning connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  // Attempt update should throw error due to no auth token
  await TestValidator.error(
    "Unauthorized user cannot update record",
    async () => {
      await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.updateSecretRegenerationRecord(
        unauthConn,
        {
          id: secretRegen.id,
          body: secretRegenUpdateBody,
        },
      );
    },
  );
}
