import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";

/**
 * Perform an authorized update on a user-suggested tag to change its status
 * from pending to approved.
 *
 * This test covers the complete flow starting with a new regular user join,
 * creating a user tag suggestion "Low Carb" with initial "pending" status,
 * and then updating that tag's status to "approved".
 *
 * The test verifies that authentication context is correctly established
 * and maintained, the update is successfully persisted, and all api
 * responses conform to their schema.
 *
 * Business rules such as using exact enum values and proper ID handling are
 * validated.
 *
 * Steps:
 *
 * 1. Create a new user by joining as a regular user
 * 2. Create a user tag suggestion "Low Carb" with "pending" status
 * 3. Update that user tag status to "approved"
 * 4. Verify update success and validate data integrity
 */
export async function test_api_user_tag_update_status_approved(
  connection: api.IConnection,
) {
  // 1. Create a new regular user (join) with random alphanumeric email, username, and password hash
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
        username: RandomGenerator.name(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Create user tag suggestion "Low Carb" with status "pending" using the authenticated user
  const createdTag: IRecipeSharingUserTags =
    await api.functional.recipeSharing.regularUser.userTags.create(connection, {
      body: {
        user_id: user.id,
        suggested_name: "Low Carb",
        status: "pending",
      } satisfies IRecipeSharingUserTags.ICreate,
    });
  typia.assert(createdTag);

  // 3. Update the user tag status to "approved"
  const updatedTag: IRecipeSharingUserTags =
    await api.functional.recipeSharing.regularUser.userTags.update(connection, {
      userTagId: createdTag.id satisfies string & tags.Format<"uuid">,
      body: {
        status: "approved",
      } satisfies IRecipeSharingUserTags.IUpdate,
    });
  typia.assert(updatedTag);

  // 4. Assert correctness and integrity
  TestValidator.equals(
    "User tag ID remains unchanged",
    updatedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "User tag status updated to approved",
    updatedTag.status,
    "approved",
  );
  TestValidator.equals("User ID remains the same", updatedTag.user_id, user.id);
  TestValidator.equals(
    "Suggested name remains unchanged",
    updatedTag.suggested_name,
    createdTag.suggested_name,
  );
}
