import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * This test validates that unauthorized users cannot delete a difficulty
 * level.
 *
 * It first performs the mandatory moderator join to establish proper user
 * context. Then, it attempts to delete a difficulty level without
 * authorization, expecting failure. This confirms enforcement of access
 * control on the deletion endpoint.
 */
export async function test_api_difficultylevel_delete_unauthorized_failure(
  connection: api.IConnection,
) {
  // 1. Perform moderator join operation to establish the moderator user and authorization context
  const moderatorCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@moderator.com",
    password_hash: RandomGenerator.alphaNumeric(30),
    username: RandomGenerator.name(3),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateBody,
  });
  typia.assert(moderator);

  // 2. Attempt deletion of a difficulty level ID without authorization
  // Create a new connection that has empty headers (no authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Generate a random UUID to attempt deleting
  const difficultyLevelId = typia.random<string & tags.Format<"uuid">>();

  // 3. Expect deletion to fail due to authorization
  await TestValidator.error(
    "unauthorized user cannot delete difficulty level",
    async () => {
      await api.functional.recipeSharing.moderator.difficultyLevels.erase(
        unauthConn,
        { id: difficultyLevelId },
      );
    },
  );
}
