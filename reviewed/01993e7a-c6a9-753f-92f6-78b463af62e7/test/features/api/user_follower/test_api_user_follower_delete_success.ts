import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test successful deletion of a user follower relationship.
 *
 * This test creates two regular users, performs necessary authentication join
 * operations, then tests deletion of a user follower relationship by ID.
 * Because no API to create followers or retrieve follower IDs is given, this
 * test uses a randomly generated UUID for the userFollowerId to test the
 * deletion endpoint for success and error conditions.
 *
 * Scenario steps:
 *
 * 1. Create first regular user (join and authenticate).
 * 2. Create second regular user (join and authenticate).
 * 3. Attempt deletion of a user follower relationship by a generated UUID.
 * 4. Attempt deletion again with the same UUID to verify error handling.
 *
 * All API calls are awaited and validated with typia assertions. Errors on
 * invalid operations are caught with TestValidator.error.
 */
export async function test_api_user_follower_delete_success(
  connection: api.IConnection,
) {
  // 1. Create first regular user
  const userA_email = `${RandomGenerator.alphabets(8)}@example.com`;
  const userA_passwordHash = RandomGenerator.alphaNumeric(32);
  const userA_username = RandomGenerator.name(1);
  const userA: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: userA_email,
        password_hash: userA_passwordHash,
        username: userA_username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(userA);

  // 2. Create second regular user
  const userB_email = `${RandomGenerator.alphabets(8)}@example.com`;
  const userB_passwordHash = RandomGenerator.alphaNumeric(32);
  const userB_username = RandomGenerator.name(1);
  const userB: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: userB_email,
        password_hash: userB_passwordHash,
        username: userB_username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(userB);

  // 3. Generate a random UUID userFollowerId to test the deletion API
  const userFollowerId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call delete user follower API - expecting success
  await api.functional.recipeSharing.regularUser.userFollowers.erase(
    connection,
    {
      userFollowerId: userFollowerId,
    },
  );

  // 5. Call delete user follower API again with the same ID - expecting error
  // Assuming the second call throws because resource is missing
  await TestValidator.error(
    "re-deletion of the same user follower relationship should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.userFollowers.erase(
        connection,
        {
          userFollowerId: userFollowerId,
        },
      );
    },
  );
}
