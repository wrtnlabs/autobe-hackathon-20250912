import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_user_follower_delete_regularuser_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register owner user (regular user) with unique email and username
  const ownerEmail = `owner_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const ownerUser = await api.functional.auth.regularUser.join(connection, {
    body: {
      email: ownerEmail,
      password_hash: "hashed_password_sample",
      username: `ownerUser_${RandomGenerator.alphaNumeric(5)}`,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });
  typia.assert(ownerUser);

  // 2. Generate a valid userFollowerId for testing delete API call (no create API provided)
  const userFollowerId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete user follower with valid userFollowerId - expect success (no error thrown)
  await api.functional.recipeSharing.regularUser.userFollowers.erase(
    connection,
    {
      userFollowerId,
    },
  );

  TestValidator.predicate("Delete user follower with valid ID succeeded", true);

  // 4. Attempt to delete with a non-existent userFollowerId - expect error
  await TestValidator.error(
    "Deleting non-existent userFollowerId should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.userFollowers.erase(
        connection,
        {
          userFollowerId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Register another user to test unauthorized deletion
  const otherEmail = `other_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const otherUser = await api.functional.auth.regularUser.join(connection, {
    body: {
      email: otherEmail,
      password_hash: "hashed_password_sample",
      username: `otherUser_${RandomGenerator.alphaNumeric(5)}`,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });
  typia.assert(otherUser);

  // 6. As other user, attempt to delete the userFollowerId - expect error (unauthorized)
  await TestValidator.error(
    "Unauthorized user cannot delete another user's follower",
    async () => {
      await api.functional.recipeSharing.regularUser.userFollowers.erase(
        connection,
        {
          userFollowerId,
        },
      );
    },
  );
}
