import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";

/**
 * Test the deletion of an OAuth server token monitor event by an
 * authenticated admin.
 *
 * This scenario ensures that only authorized admin users can delete OAuth
 * server token monitor events, that token monitors are properly removed,
 * and that invalid or unauthorized deletion attempts result in appropriate
 * errors.
 *
 * Test Steps:
 *
 * 1. Create and authenticate an admin user via /auth/admin/join.
 * 2. Generate a random UUID representing a token monitor record ID.
 * 3. Perform DELETE request to remove the token monitor with the generated ID.
 * 4. Attempt deletion with a non-existent UUID to verify error handling.
 * 5. Attempt deletion without authentication to verify authorization
 *    enforcement.
 */
export async function test_api_oauth_server_token_monitor_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "StrongPassword123!",
  } satisfies IOauthServerAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuthorized);

  // 2. Generate a random UUID as token monitor ID
  const tokenMonitorId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete with a valid token monitor ID
  await api.functional.oauthServer.admin.oauthServerTokenMonitors.erase(
    connection,
    { id: tokenMonitorId },
  );

  // 4. Delete with non-existent ID - should cause error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent token monitor ID deletion should throw error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.erase(
        connection,
        { id: nonExistentId },
      );
    },
  );

  // 5. Attempt deletion with fresh connection (unauthenticated) - should throw unauthorized error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated delete should throw unauthorized error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.erase(
        unauthenticatedConnection,
        { id: tokenMonitorId },
      );
    },
  );
}
