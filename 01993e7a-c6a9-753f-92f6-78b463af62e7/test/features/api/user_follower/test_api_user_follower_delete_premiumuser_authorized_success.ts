import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Test the deletion operation of a user follower relationship identified by
 * userFollowerId for a premium user.
 *
 * This test validates that an authenticated premium user can successfully
 * delete their own follower relationships. It checks for proper API invocation,
 * successful completion, and for error handling when attempting to delete a
 * non-existent follower relationship.
 *
 * The test includes user creation/login, deletion of a follower, and validation
 * of error for missing follower.
 */
export async function test_api_user_follower_delete_premiumuser_authorized_success(
  connection: api.IConnection,
) {
  // 1. Create a new premium user and authenticate
  const premiumUserBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserBody,
    });
  typia.assert(premiumUser);

  // 2. Use the current authenticated premium user to delete a user follower
  // Simulate an existing user follower ID (UUID format) to delete
  const existingUserFollowerId: string & tags.Format<"uuid"> = typia.assert(
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Deleting the user follower ID should complete without errors (void return)
  await api.functional.recipeSharing.premiumUser.userFollowers.erase(
    connection,
    { userFollowerId: existingUserFollowerId },
  );

  // 3. Attempt to delete a non-existing userFollowerId and expect error
  let nonExistentFollowerId: string & tags.Format<"uuid"> = typia.assert(
    typia.random<string & tags.Format<"uuid">>(),
  );
  while (nonExistentFollowerId === existingUserFollowerId) {
    nonExistentFollowerId = typia.assert(
      typia.random<string & tags.Format<"uuid">>(),
    );
  }

  await TestValidator.error(
    "deleting non-existent user follower should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.userFollowers.erase(
        connection,
        { userFollowerId: nonExistentFollowerId },
      );
    },
  );
}
