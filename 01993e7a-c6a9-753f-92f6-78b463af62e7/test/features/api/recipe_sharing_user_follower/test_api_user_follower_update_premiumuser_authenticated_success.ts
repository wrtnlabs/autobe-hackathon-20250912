import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";

export async function test_api_user_follower_update_premiumuser_authenticated_success(
  connection: api.IConnection,
) {
  // Step 1: Create a premium user and authenticate
  const premiumUserInput = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser = await api.functional.auth.premiumUser.join(connection, {
    body: premiumUserInput,
  });
  typia.assert(premiumUser);

  // Step 2: Generate realistic UUIDs for follower and followee
  const followerUserId = typia.random<string & tags.Format<"uuid">>();
  const followeeUserId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Generate a UUID to simulate an existing userFollowerId
  const userFollowerId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Prepare update request body with valid UUIDs and deleted_at as null
  const updateBody = {
    follower_user_id: followerUserId,
    followee_user_id: followeeUserId,
    deleted_at: null,
  } satisfies IRecipeSharingUserFollower.IUpdate;

  // Step 5: Perform the update operation
  const updatedUserFollower =
    await api.functional.recipeSharing.premiumUser.userFollowers.update(
      connection,
      {
        userFollowerId: userFollowerId,
        body: updateBody,
      },
    );
  typia.assert(updatedUserFollower);

  // Step 6: Validate that response fields match inputs
  TestValidator.equals(
    "Updated userFollower id should match request",
    updatedUserFollower.id,
    userFollowerId,
  );

  TestValidator.equals(
    "Updated follower_user_id should match input",
    updatedUserFollower.follower_user_id,
    followerUserId,
  );

  TestValidator.equals(
    "Updated followee_user_id should match input",
    updatedUserFollower.followee_user_id,
    followeeUserId,
  );

  TestValidator.equals(
    "deleted_at should be null after update",
    updatedUserFollower.deleted_at ?? null,
    null,
  );

  // Step 7: Validate timestamps are valid ISO 8601 date-time strings
  const createdAt = updatedUserFollower.created_at;
  const updatedAt = updatedUserFollower.updated_at;

  TestValidator.predicate(
    "created_at should be valid ISO date-time",
    typeof createdAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(createdAt),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO date-time",
    typeof updatedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(updatedAt),
  );
}
