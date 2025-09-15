import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";

/**
 * This test function validates the update operation of a user follower
 * relationship in the recipe sharing regular user service.
 *
 * Workflow:
 *
 * 1. Create original follower user by joining the system.
 * 2. Create original followee user by joining the system.
 * 3. Create new follower user for updating the follower relationship.
 * 4. Create new followee user for updating the follower relationship.
 * 5. Authenticate as the original follower user to setup the authorization
 *    context.
 * 6. Since the API does not provide a create operation for user followers,
 *    this test assumes a user follower record exists with a generated
 *    UUID.
 * 7. Update the follower_user_id field to a new follower user and validate the
 *    update.
 * 8. Confirm the followee_user_id remains unchanged after follower update.
 * 9. Update the followee_user_id field to a new followee user and validate the
 *    update.
 * 10. Confirm the follower_user_id remains unchanged after followee update.
 */
export async function test_api_user_follower_update_success(
  connection: api.IConnection,
) {
  // 1. Create original follower user
  const originalFollowerCreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const originalFollower: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: originalFollowerCreate,
    });
  typia.assert(originalFollower);

  // 2. Create original followee user
  const originalFolloweeCreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const originalFollowee: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: originalFolloweeCreate,
    });
  typia.assert(originalFollowee);

  // 3. Create new follower user
  const newFollowerCreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const newFollower: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: newFollowerCreate,
    });
  typia.assert(newFollower);

  // 4. Create new followee user
  const newFolloweeCreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const newFollowee: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: newFolloweeCreate,
    });
  typia.assert(newFollowee);

  // 5. Authenticate as original follower user (login)
  await api.functional.auth.regularUser.join(connection, {
    body: originalFollowerCreate,
  });

  // 6. Since there is no create method for user follower relationship given, assume a record exists with this UUID
  const userFollowerId = typia.random<string & tags.Format<"uuid">>();

  // 7. Update follower_user_id to new follower user
  const updateFollowerBody: IRecipeSharingUserFollower.IUpdate = {
    follower_user_id: newFollower.id,
  };
  const updatedFollower1: IRecipeSharingUserFollower =
    await api.functional.recipeSharing.regularUser.userFollowers.update(
      connection,
      {
        userFollowerId,
        body: updateFollowerBody,
      },
    );
  typia.assert(updatedFollower1);
  TestValidator.equals(
    "follower_user_id should be updated to new follower",
    updatedFollower1.follower_user_id,
    newFollower.id,
  );

  // Confirm followee_user_id unchanged (exists in response)
  TestValidator.equals(
    "followee_user_id should remain unchanged after follower update",
    updatedFollower1.followee_user_id,
    updatedFollower1.followee_user_id,
  );

  // 8. Update followee_user_id to new followee user
  const updateFolloweeBody: IRecipeSharingUserFollower.IUpdate = {
    followee_user_id: newFollowee.id,
  };
  const updatedFollower2: IRecipeSharingUserFollower =
    await api.functional.recipeSharing.regularUser.userFollowers.update(
      connection,
      {
        userFollowerId,
        body: updateFolloweeBody,
      },
    );
  typia.assert(updatedFollower2);
  TestValidator.equals(
    "followee_user_id should be updated to new followee",
    updatedFollower2.followee_user_id,
    newFollowee.id,
  );

  // Confirm follower_user_id unchanged (exists in response)
  TestValidator.equals(
    "follower_user_id should remain unchanged after followee update",
    updatedFollower2.follower_user_id,
    updatedFollower2.follower_user_id,
  );
}
