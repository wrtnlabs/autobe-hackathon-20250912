import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Validate duplicate recipe category creation failure for moderators.
 *
 * This E2E test validates the business rule enforcing uniqueness of recipe
 * category names for moderator users. Steps performed:
 *
 * 1. Create and authenticate a moderator.
 * 2. Create an initial recipe category with a random category type and name.
 * 3. Attempt to create a second category with the same name and type.
 * 4. Assert that the second creation fails due to duplicate name constraint.
 *
 * This test ensures that the backend correctly rejects duplicate recipe
 * categories, enforcing taxonomy integrity.
 */
export async function test_api_moderator_recipe_category_create_duplicate_name_failure(
  connection: api.IConnection,
) {
  // 1. Moderator user creation through join operation
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(20),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Creating a recipe category with random category_type and name
  const categoryType = RandomGenerator.alphaNumeric(5);
  const categoryName = RandomGenerator.name(2);

  const firstCategory: IRecipeSharingRecipeCategory =
    await api.functional.recipeSharing.moderator.recipeCategories.create(
      connection,
      {
        body: {
          category_type: categoryType,
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRecipeSharingRecipeCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category name should match input",
    firstCategory.name,
    categoryName,
  );

  // 3. Attempt to create second recipe category with duplicate name and type: expect failure
  await TestValidator.error(
    "duplicate category name creation should fail",
    async () => {
      await api.functional.recipeSharing.moderator.recipeCategories.create(
        connection,
        {
          body: {
            category_type: categoryType,
            name: categoryName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRecipeSharingRecipeCategory.ICreate,
        },
      );
    },
  );
}
