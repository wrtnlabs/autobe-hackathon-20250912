import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Validate unauthorized failure when attempting to update a recipe category
 * without moderator authentication.
 *
 * This test ensures that the system properly enforces authorization rules
 * by denying update operations to unauthenticated or unauthorized users. It
 * first performs a moderator join operation to establish a moderator user
 * context but does NOT authenticate the connection for update. Then it
 * attempts to update a recipe category using a fresh, unauthenticated
 * connection, expecting an error response.
 *
 * Test Steps:
 *
 * 1. Execute moderator join to create a moderator user (dependency).
 * 2. Attempt to update a recipe category with minimal valid data using an
 *    unauthenticated connection.
 * 3. Assert that the update operation fails due to unauthorized access with
 *    TestValidator.error.
 */
export async function test_api_moderator_recipe_category_update_unauthorized_failure(
  connection: api.IConnection,
) {
  // 1. Moderator join dependency call to ensure moderator user exists
  const moderatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32), // Simulated hash
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Attempt recipe category update WITHOUT authenticator token (using original connection)
  const unauthenticatedConnection = { ...connection, headers: {} };

  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
  } satisfies IRecipeSharingRecipeCategory.IUpdate;

  await TestValidator.error(
    "should fail to update recipe category due to unauthorized access",
    async () => {
      await api.functional.recipeSharing.moderator.recipeCategories.update(
        unauthenticatedConnection,
        {
          recipeCategoryId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
