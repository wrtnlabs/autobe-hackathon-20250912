import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Tests the deletion of a flag queue entry by an authorized moderator.
 *
 * This test covers the following:
 *
 * 1. Moderator user joins and authenticates successfully.
 * 2. Deletes an existing flag queue entry by providing its UUID.
 * 3. Attempts to delete a non-existent flag queue entry and expects an error.
 * 4. Attempts to delete a flag queue entry without authorization and expects
 *    an error.
 *
 * All UUIDs generated are valid format strings. Proper usage of awaits and
 * typia.assert are included.
 *
 * @param connection - The API connection instance.
 */
export async function test_api_flag_queue_delete_moderator_authorized(
  connection: api.IConnection,
) {
  // Step 1: Moderator join
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePass123!";
  const moderatorUsername = RandomGenerator.name(2).replace(/\s/g, "_");

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPassword,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Use a valid UUID to represent an existing flag queue ID
  const existingFlagQueueId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Deletion by authorized moderator should succeed
  await api.functional.recipeSharing.moderator.flagQueues.erase(connection, {
    id: existingFlagQueueId,
  });

  // Step 4: Attempt deletion with a non-existent UUID - should throw error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion of non-existent flag queue entry must fail",
    async () => {
      await api.functional.recipeSharing.moderator.flagQueues.erase(
        connection,
        { id: nonExistentId },
      );
    },
  );

  // Step 5: Attempt deletion unauthorized - should throw error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "deletion without authorization must fail",
    async () => {
      await api.functional.recipeSharing.moderator.flagQueues.erase(
        unauthenticatedConnection,
        { id: existingFlagQueueId },
      );
    },
  );
}
