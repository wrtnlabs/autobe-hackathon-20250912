import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test complete workflow of moderator user deletion.
 *
 * This test function performs the following steps sequentially to verify
 * the deletion functionality:
 *
 * 1. Moderator user joins the system through the join API endpoint to
 *    establish a valid moderator session.
 * 2. Deletion API is called with the moderator user ID to erase the record.
 * 3. Verification is performed to ensure that the moderator user no longer
 *    exists or causes an error when accessed.
 *
 * Each API interaction uses precise DTOs and awaited calls, with runtime
 * validation checks on outputs. Business logic validation occurs by
 * checking the successful flow and error response after deletion.
 */
export async function test_api_moderator_delete_success(
  connection: api.IConnection,
) {
  // 1. Create moderator user via join API
  const joinBody = {
    email: RandomGenerator.alphabets(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(moderator);

  // 2. Delete the created moderator user by UUID
  await api.functional.recipeSharing.moderator.moderators.erase(connection, {
    id: moderator.id,
  });

  // 3. Verify deletion by attempting to delete again - expect failure
  await TestValidator.error(
    "deleting a non-existent moderator should fail",
    async () => {
      await api.functional.recipeSharing.moderator.moderators.erase(
        connection,
        {
          id: moderator.id,
        },
      );
    },
  );
}
