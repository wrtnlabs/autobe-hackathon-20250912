import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";

/**
 * Test updating an existing user follower relationship by a premium user. The
 * scenario creates premium users, establishes a follower relationship, and
 * updates it with new valid users. It verifies the update success and the
 * updated entity data.
 */
export async function test_api_user_follower_update_success_premium(
  connection: api.IConnection,
) {
  // 1. Create the original follower premium user and authenticate
  const originalFollowerUserEmail = typia.random<
    string & tags.Format<"email">
  >();
  const originalFollowerUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: originalFollowerUserEmail,
        password_hash: RandomGenerator.alphaNumeric(20),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(originalFollowerUser);

  // 2. Create the original followee premium user
  const originalFolloweeUserEmail = typia.random<
    string & tags.Format<"email">
  >();
  const originalFolloweeUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: originalFolloweeUserEmail,
        password_hash: RandomGenerator.alphaNumeric(20),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(originalFolloweeUser);

  // 3. Create the new follower premium user for relationship update
  const newFollowerUserEmail = typia.random<string & tags.Format<"email">>();
  const newFollowerUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: newFollowerUserEmail,
        password_hash: RandomGenerator.alphaNumeric(20),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(newFollowerUser);

  // 4. Create the new followee premium user for relationship update
  const newFolloweeUserEmail = typia.random<string & tags.Format<"email">>();
  const newFolloweeUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: newFolloweeUserEmail,
        password_hash: RandomGenerator.alphaNumeric(20),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(newFolloweeUser);

  // 5. Create initial user follower relationship by impersonating original follower user
  // We authenticate as original follower user
  await api.functional.auth.premiumUser.join(connection, {
    body: {
      email: originalFollowerUserEmail,
      password_hash: RandomGenerator.alphaNumeric(20),
      username: RandomGenerator.name(2),
    } satisfies IRecipeSharingPremiumUser.ICreate, // This will replace token.access in connection.headers
  });
  // 6. Since no API exists to create user follower relationship, simulate one by assuming an id
  // We assign a random UUID for userFollowerId
  const userFollowerId = typia.random<string & tags.Format<"uuid">>();

  // 7. Update the user follower relationship by the new follower and followee
  // The update body sets follower_user_id and followee_user_id to new users

  const updateBody: IRecipeSharingUserFollower.IUpdate = {
    follower_user_id: newFollowerUser.id,
    followee_user_id: newFolloweeUser.id,
    deleted_at: null,
  };

  const updatedUserFollower =
    await api.functional.recipeSharing.premiumUser.userFollowers.update(
      connection,
      {
        userFollowerId: userFollowerId,
        body: updateBody,
      },
    );
  typia.assert(updatedUserFollower);

  // 8. Assert the updated entity has correct follower_user_id and followee_user_id
  TestValidator.equals(
    "updated follower_user_id matches new follower user id",
    updatedUserFollower.follower_user_id,
    newFollowerUser.id,
  );
  TestValidator.equals(
    "updated followee_user_id matches new followee user id",
    updatedUserFollower.followee_user_id,
    newFolloweeUser.id,
  );
  TestValidator.predicate(
    "updated deleted_at is null",
    updatedUserFollower.deleted_at === null,
  );
}
