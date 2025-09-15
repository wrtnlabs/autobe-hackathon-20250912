import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Tests successful deletion of a user follower relationship by a premium
 * user.
 *
 * This test performs the following operations:
 *
 * 1. Registers two premium users via the join API.
 * 2. Simulates the existence of a follower relationship with a random UUID.
 * 3. Deletes the follower relationship by the generated UUID.
 * 4. Ensures the deletion completes successfully without errors.
 *
 * Note: The follower creation API is not provided; thus, the test assumes
 * the follower relation exists identified by a random UUID.
 *
 * This validates the delete follower API's behavior and the handling of
 * premium user authorization.
 */
export async function test_api_user_follower_delete_success_premium(
  connection: api.IConnection,
) {
  // 1. Register first premium user (User A)
  const emailA = `${RandomGenerator.alphabets(5)}${typia.random<string & tags.Format<"email">>()}`;
  const passwordHashA = RandomGenerator.alphaNumeric(32);
  const usernameA = RandomGenerator.name(2);

  const userA: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: emailA,
        password_hash: passwordHashA,
        username: usernameA,
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(userA);

  // 2. Register second premium user (User B)
  const emailB = `${RandomGenerator.alphabets(5)}${typia.random<string & tags.Format<"email">>()}`;
  const passwordHashB = RandomGenerator.alphaNumeric(32);
  const usernameB = RandomGenerator.name(2);

  const userB: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: emailB,
        password_hash: passwordHashB,
        username: usernameB,
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(userB);

  // 3. Simulate follower relationship ID
  const userFollowerId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call the delete API to remove the follower relationship
  await api.functional.recipeSharing.premiumUser.userFollowers.erase(
    connection,
    {
      userFollowerId: userFollowerId,
    },
  );
  // 5. Success is implicit if no error thrown
}
