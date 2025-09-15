import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Test update failure with invalid recipeCategoryId yielding 404 not found
 * error response.
 *
 * This test follows these steps:
 *
 * 1. Create a moderator user by calling /auth/moderator/join for
 *    authentication setup.
 * 2. Attempt to update a recipe category with a randomly generated,
 *    non-existent UUID as recipeCategoryId.
 * 3. Use realistic update body data with optional properties (category_type,
 *    name, description).
 * 4. Expect the update operation to throw an error, indicating 404 Not Found.
 */
export async function test_api_moderator_recipe_category_update_not_found_error(
  connection: api.IConnection,
) {
  // 1. Create a moderator user and set authentication context
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderatorUsername = RandomGenerator.name(2);

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Attempt to update a non-existent recipe category
  const invalidCategoryId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateBody = {
    category_type: RandomGenerator.pick([
      "cuisine",
      "diet",
      "difficulty",
    ] as const),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRecipeSharingRecipeCategory.IUpdate;

  await TestValidator.error(
    "update should fail with 404 not found for non-existent recipeCategoryId",
    async () => {
      await api.functional.recipeSharing.moderator.recipeCategories.update(
        connection,
        {
          recipeCategoryId: invalidCategoryId,
          body: updateBody,
        },
      );
    },
  );
}
