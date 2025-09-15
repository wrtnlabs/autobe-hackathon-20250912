import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Validate that deleting a premium user without authentication fails.
 *
 * This test ensures the API rejects deletion attempts without
 * authentication.
 *
 * Workflow:
 *
 * 1. Prepare an unauthenticated connection.
 * 2. Generate a random premium user ID (UUID).
 * 3. Attempt deletion without authentication.
 * 4. Verify an error is thrown.
 */
export async function test_api_premium_user_delete_premium_user_unauthorized_error(
  connection: api.IConnection,
) {
  // 1. Prepare unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Generate a valid UUID for user deletion
  const randomId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt deletion and expect failure
  await TestValidator.error(
    "delete premium user unauthorized error",
    async () => {
      await api.functional.recipeSharing.premiumUser.premiumUsers.erase(
        unauthConn,
        { id: randomId },
      );
    },
  );
}
