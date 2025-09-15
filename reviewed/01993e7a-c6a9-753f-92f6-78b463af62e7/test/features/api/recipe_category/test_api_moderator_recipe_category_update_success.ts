import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Test updating an existing recipe category by recipeCategoryId with valid
 * moderator authentication. Validate updates applied and response data
 * represents updated category.
 */
export async function test_api_moderator_recipe_category_update_success(
  connection: api.IConnection,
) {
  // Step 1: Moderator user creation and authentication
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(24);
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

  // Step 2: Prepare update data for recipe category
  const recipeCategoryId: string = typia.random<string & tags.Format<"uuid">>();

  const updateBody = {
    category_type: RandomGenerator.pick([
      "cuisine",
      "diet",
      "difficulty",
    ] as const),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRecipeSharingRecipeCategory.IUpdate;

  // Step 3: Perform update operation
  const updatedCategory: IRecipeSharingRecipeCategory =
    await api.functional.recipeSharing.moderator.recipeCategories.update(
      connection,
      {
        recipeCategoryId,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate the response
  TestValidator.equals(
    "updated recipe category id should match",
    updatedCategory.id,
    recipeCategoryId,
  );

  if (updateBody.category_type !== undefined) {
    TestValidator.equals(
      "updated recipe category type should match",
      updatedCategory.category_type,
      updateBody.category_type,
    );
  }

  if (updateBody.name !== undefined) {
    TestValidator.equals(
      "updated recipe category name should match",
      updatedCategory.name,
      updateBody.name,
    );
  }

  // Check description considering null and undefined distinctness
  if (Object.prototype.hasOwnProperty.call(updateBody, "description")) {
    TestValidator.equals(
      "updated recipe category description should match",
      updatedCategory.description === null ? null : updatedCategory.description,
      updateBody.description === null ? null : updateBody.description,
    );
  }

  // Additional validations can be added here as needed
}
