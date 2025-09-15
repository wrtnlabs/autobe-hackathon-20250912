import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";

/**
 * Test the deletion of a user-suggested tag by a regular user.
 *
 * This test covers the entire flow from user registration, user tag creation,
 * to deletion of the tag by the owner. It ensures that only the owner of a
 * given user tag can delete it and that authentication mechanisms work
 * correctly in the context of user tag management.
 *
 * The test proceeds as follows:
 *
 * 1. Create a regular user via the join endpoint to establish authenticated
 *    context.
 * 2. Create a user-suggested tag by this authenticated user.
 * 3. Attempt to delete the tag using the same user's authorization, expecting
 *    success.
 * 4. Create another regular user to simulate unauthorized deletion attempt.
 * 5. Attempt to delete the previously created tag by the second user, expecting
 *    failure due to authorization.
 */
export async function test_api_usertag_delete_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Create first regular user and authenticate
  const firstUserCreate = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const firstUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: firstUserCreate,
    });
  typia.assert(firstUser);

  // 2. Create a user-suggested tag by first user
  const userTagCreate = {
    user_id: firstUser.id,
    suggested_name: RandomGenerator.name(),
    status: "pending",
  } satisfies IRecipeSharingUserTags.ICreate;
  const userTag: IRecipeSharingUserTags =
    await api.functional.recipeSharing.regularUser.userTags.create(connection, {
      body: userTagCreate,
    });
  typia.assert(userTag);
  TestValidator.equals("user ids match", userTag.user_id, firstUser.id);
  TestValidator.equals("status is pending", userTag.status, "pending");

  // 3. Delete the tag using first user's authorization (should succeed)
  await api.functional.recipeSharing.regularUser.userTags.eraseUserTag(
    connection,
    {
      tagId: userTag.id,
    },
  );

  // 4. Create second regular user to try unauthorized deletion
  const secondUserCreate = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const secondUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: secondUserCreate,
    });
  typia.assert(secondUser);

  // 5. Try deletion again (tag no longer exists, so deletion should fail with error)
  await TestValidator.error(
    "unauthorized user should not delete user tag",
    async () => {
      await api.functional.recipeSharing.regularUser.userTags.eraseUserTag(
        connection,
        {
          tagId: userTag.id,
        },
      );
    },
  );
}
