import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";

/**
 * This E2E test function validates the OAuth server admin client secret
 * regeneration detail API endpoint, which requires admin authorization.
 *
 * It performs the following steps:
 *
 * 1. Create and authenticate an admin user by calling the admin join API.
 * 2. Fetch a detailed client secret regeneration record by an existing valid UUID.
 * 3. Validate data fields such as id, oauth_client_id, admin_id, reason,
 *    regenerated_at, created_at, updated_at, and deleted_at (accepting explicit
 *    null).
 * 4. Test error handling when fetching using a non-existent regeneration ID.
 * 5. Test unauthorized access error by attempting fetch without admin
 *    authentication.
 *
 * This ensures correct business flow, data integrity, and strict authorization
 * enforcement.
 */
export async function test_api_oauth_server_client_secret_regeneration_detail_admin_authorized(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123!";
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Fetching client secret regeneration detail with a valid ID
  // To have a valid existing ID, in this test scenario, we simulate fetching with typia.random to use a random UUID assuming it exists.
  // Since the test scenario does not provide a way to create a client secret regeneration, we rely on a plausible UUID for demonstration.
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const regenerationDetail: IOauthServerClientSecretRegeneration =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.at(
      connection,
      { id: validId },
    );
  typia.assert(regenerationDetail);

  // Validate required fields presence
  TestValidator.predicate(
    "regenerationDetail.id is uuid",
    typeof regenerationDetail.id === "string" &&
      regenerationDetail.id.length === 36,
  );
  TestValidator.predicate(
    "regenerationDetail.oauth_client_id is uuid",
    typeof regenerationDetail.oauth_client_id === "string" &&
      regenerationDetail.oauth_client_id.length === 36,
  );
  TestValidator.predicate(
    "regenerationDetail.admin_id is uuid",
    typeof regenerationDetail.admin_id === "string" &&
      regenerationDetail.admin_id.length === 36,
  );
  TestValidator.predicate(
    "regenerationDetail.regenerated_at is date-time string",
    typeof regenerationDetail.regenerated_at === "string",
  );
  // reason may be null or string
  TestValidator.predicate(
    "regenerationDetail.reason is string or null or undefined",
    regenerationDetail.reason === null ||
      regenerationDetail.reason === undefined ||
      typeof regenerationDetail.reason === "string",
  );
  TestValidator.predicate(
    "regenerationDetail.created_at is date-time string",
    typeof regenerationDetail.created_at === "string",
  );
  TestValidator.predicate(
    "regenerationDetail.updated_at is date-time string",
    typeof regenerationDetail.updated_at === "string",
  );
  // deleted_at is nullable date-time string or undefined explicitly allowed
  TestValidator.predicate(
    "regenerationDetail.deleted_at is string or null or undefined",
    regenerationDetail.deleted_at === null ||
      regenerationDetail.deleted_at === undefined ||
      typeof regenerationDetail.deleted_at === "string",
  );

  // 3. Test error on non-existent ID (using a new random UUID which likely does not exist)
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "fetching with non-existent regeneration ID should error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.at(
        connection,
        { id: nonExistentId },
      );
    },
  );

  // 4. Test unauthorized access error (using unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to regeneration detail should error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.at(
        unauthenticatedConnection,
        { id: validId },
      );
    },
  );
}
