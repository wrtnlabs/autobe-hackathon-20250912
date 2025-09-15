import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";

/**
 * Update an existing OAuth server client secret regeneration record by ID.
 *
 * This test validates the update workflow performed by an authorized admin
 * user. It confirms that the "reason" for regeneration can be changed, and
 * timestamps remain consistent. The test covers:
 *
 * 1. Admin user creation and authentication.
 * 2. Creation of a client secret regeneration record for update.
 * 3. Update of the "reason" field in the regeneration record using PUT API.
 * 4. Verification that the record was updated correctly.
 * 5. Negative cases where unauthorized access or non-existent records are
 *    handled properly.
 *
 * This ensures strict role-based access control and audit record integrity
 * in OAuth server management.
 */
export async function test_api_oauth_server_client_secret_regeneration_update_admin_authorized(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "ValidPass123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a client secret regeneration record
  const regenerationCreateBody = {
    oauth_client_id: typia.random<string & tags.Format<"uuid">>(),
    admin_id: admin.id,
    regenerated_at: new Date().toISOString(),
    reason: "Initial secret regeneration reason",
  } satisfies IOauthServerClientSecretRegeneration.ICreate;

  const regeneration: IOauthServerClientSecretRegeneration =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.create(
      connection,
      {
        body: regenerationCreateBody,
      },
    );
  typia.assert(regeneration);

  // 3. Update the reason field of the regeneration record
  const updatedReason = "Updated secret regeneration reason";
  const updateBody = {
    reason: updatedReason,
  } satisfies IOauthServerClientSecretRegeneration.IUpdate;

  const updatedRecord: IOauthServerClientSecretRegeneration =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.updateSecretRegenerationRecord(
      connection,
      {
        id: regeneration.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRecord);

  // 4. Validate updated record fields
  TestValidator.equals(
    "Record ID remains the same",
    updatedRecord.id,
    regeneration.id,
  );
  TestValidator.equals(
    "Admin ID remains the same",
    updatedRecord.admin_id,
    admin.id,
  );
  TestValidator.equals(
    "OAuth client ID remains the same",
    updatedRecord.oauth_client_id,
    regeneration.oauth_client_id,
  );
  TestValidator.equals(
    "Updated reason matches",
    updatedRecord.reason,
    updatedReason,
  );
  TestValidator.predicate(
    "Updated timestamp is different from created",
    updatedRecord.updated_at !== regeneration.updated_at,
  );

  // 5. Negative test - updating non-existent record should fail
  await TestValidator.error(
    "Updating non-existent record throws error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.updateSecretRegenerationRecord(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(), // random UUID not existing
          body: {
            reason: "This update should fail",
          } satisfies IOauthServerClientSecretRegeneration.IUpdate,
        },
      );
    },
  );

  // 6. Negative test - update without authorization (simulate by using new connection without auth)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {}, // Clear auth headers
  };
  await TestValidator.error("Unauthorized update throws error", async () => {
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.updateSecretRegenerationRecord(
      unauthenticatedConnection,
      {
        id: regeneration.id,
        body: {
          reason: "Attempted unauthorized update",
        } satisfies IOauthServerClientSecretRegeneration.IUpdate,
      },
    );
  });
}
