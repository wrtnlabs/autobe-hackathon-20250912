import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";

/**
 * Validate that creating a duplicate user follower relationship results in an
 * error. The test creates two distinct regular users and successfully creates a
 * follower relationship from the first to the second. It then attempts to
 * create the same follower relationship again and expects an error indicating
 * duplication.
 */
export async function test_api_user_follower_create_duplicate(
  connection: api.IConnection,
) {
  // 1. Create first regular user with distinct credentials
  const firstUserBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@example.com`,
    password_hash: "hashedpassword1",
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const firstUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: firstUserBody,
    });
  typia.assert(firstUser);

  // 2. Create second regular user with distinct credentials
  const secondUserBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}${typia.random<string & tags.Format<"uuid">>().slice(8, 16)}@example.com`,
    password_hash: "hashedpassword2",
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const secondUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: secondUserBody,
    });
  typia.assert(secondUser);

  // 3. Create a user follower relationship successfully
  const followerCreateBody = {
    follower_user_id: firstUser.id,
    followee_user_id: secondUser.id,
  } satisfies IRecipeSharingUserFollower.ICreate;
  const follower: IRecipeSharingUserFollower =
    await api.functional.recipeSharing.regularUser.userFollowers.create(
      connection,
      { body: followerCreateBody },
    );
  typia.assert(follower);
  TestValidator.equals(
    "follower_user_id matches first user",
    follower.follower_user_id,
    firstUser.id,
  );
  TestValidator.equals(
    "followee_user_id matches second user",
    follower.followee_user_id,
    secondUser.id,
  );

  // 4. Attempt to create the same follower relationship again and expect error
  await TestValidator.error(
    "duplicate follower creation should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.userFollowers.create(
        connection,
        { body: followerCreateBody },
      );
    },
  );
}
