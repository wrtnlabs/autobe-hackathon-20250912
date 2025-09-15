import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";

/**
 * Test response when requesting a user follower relationship detail by a
 * userFollowerId that does not exist.
 *
 * This test verifies that when a logged-in regular user attempts to
 * retrieve a user follower relationship detail with a non-existent UUID,
 * the API responds with an error (e.g., 404 Not Found). This ensures proper
 * error handling for invalid resource requests.
 *
 * Steps:
 *
 * 1. Create a regular user and establish authentication.
 * 2. Attempt to fetch user follower details with a random, non-existent UUID.
 * 3. Validate that the operation raises an error indicating the resource was
 *    not found.
 */
export async function test_api_user_follower_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Join a regular user to establish authentication context
  const createdUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password_hash: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(createdUser);

  // 2. Attempt to fetch user follower detail with a non-existent userFollowerId
  // Generate a random UUID that presumably is not present
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "fetching user follower detail with non-existent ID should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.userFollowers.at(
        connection,
        {
          userFollowerId: nonExistentId,
        },
      );
    },
  );
}
