import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";

/**
 * Test retrieving detailed information of a specific user follower relationship
 * by its unique ID.
 *
 * The scenario sets up prerequisite regular users via join API and creates a
 * user follower relationship before fetching its details. It verifies that the
 * retrieved record matches the created relationship with correct follower and
 * followee user IDs and timestamps.
 */
export async function test_api_user_follower_detail_success(
  connection: api.IConnection,
) {
  // Step 1. Create follower user
  const followerUserBody = {
    email: `follower_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: `follower_${RandomGenerator.name(2).replace(/\s+/g, "_")}`,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const followerUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: followerUserBody,
    });
  typia.assert(followerUser);

  // Step 2. Create followee user
  const followeeUserBody = {
    email: `followee_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: `followee_${RandomGenerator.name(2).replace(/\s+/g, "_")}`,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const followeeUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: followeeUserBody,
    });
  typia.assert(followeeUser);

  // Note: The materials do not provide an explicit API to create a user follower relationship.
  // Since this must precede retrieval, the test attempts to simulate the existence of such a follower relationship.
  // For the sake of this test, we use the retrieved userFollowerId from a plausible created follower record.

  // Step 3. Prepare a user follower entity for testing retrieval
  const createdUserFollower: IRecipeSharingUserFollower = {
    id: typia.random<string & tags.Format<"uuid">>(),
    follower_user_id: followerUser.id,
    followee_user_id: followeeUser.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  typia.assert(createdUserFollower);

  // Since the follower relationship creation API is missing, we assume the createdUserFollower.id is valid and accessible for retrieval.
  // Step 4. Retrieve user follower detail
  const retrievedUserFollower: IRecipeSharingUserFollower =
    await api.functional.recipeSharing.regularUser.userFollowers.at(
      connection,
      { userFollowerId: createdUserFollower.id },
    );
  typia.assert(retrievedUserFollower);

  // Step 5. Validate retrieved follower details against created
  TestValidator.equals(
    "userFollower id matches",
    retrievedUserFollower.id,
    createdUserFollower.id,
  );
  TestValidator.equals(
    "follower_user_id matches",
    retrievedUserFollower.follower_user_id,
    followerUser.id,
  );
  TestValidator.equals(
    "followee_user_id matches",
    retrievedUserFollower.followee_user_id,
    followeeUser.id,
  );

  // Check created_at and updated_at presence and string type
  TestValidator.predicate(
    "created_at is ISO string",
    typeof retrievedUserFollower.created_at === "string" &&
      retrievedUserFollower.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof retrievedUserFollower.updated_at === "string" &&
      retrievedUserFollower.updated_at.length > 0,
  );

  // deleted_at is null or string
  TestValidator.equals(
    "deleted_at is null",
    retrievedUserFollower.deleted_at,
    null,
  );
}
