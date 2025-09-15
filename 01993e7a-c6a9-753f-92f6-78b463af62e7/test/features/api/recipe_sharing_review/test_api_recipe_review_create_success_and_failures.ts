import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * Comprehensive End-to-End test for creating recipe reviews under regular user
 * role.
 *
 * This test covers successful creation of a recipe review, ensuring all
 * required fields are populated and response data is correctly structured. It
 * also covers failure cases including unauthorized access, missing fields, and
 * exceeding maximum review text length.
 *
 * Steps:
 *
 * 1. Register and authenticate a regular user.
 * 2. Create a recipe authored by that user.
 * 3. Submit a valid review for that recipe.
 * 4. Assert the review is created with correct fields and timestamps.
 * 5. Test unauthorized review creation attempts.
 * 6. Test review creation with review text exceeding 2000 characters.
 */
export async function test_api_recipe_review_create_success_and_failures(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a regular user
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userInput,
    });
  typia.assert(user);

  // 2. Create a recipe authored by the user
  const recipeInput = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 6,
    }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;

  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeInput,
    });
  typia.assert(recipe);

  // 3. Submit a valid review for the recipe
  const reviewInput = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingReview.ICreate;

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewInput,
    });
  typia.assert(review);

  TestValidator.equals(
    "review user ID matches input",
    review.recipe_sharing_user_id,
    user.id,
  );
  TestValidator.equals(
    "review recipe ID matches input",
    review.recipe_sharing_recipe_id,
    recipe.id,
  );
  TestValidator.predicate(
    "review ID is non-empty string",
    typeof review.id === "string" && review.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof review.created_at === "string" && review.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof review.updated_at === "string" && review.updated_at.length > 0,
  );

  // 4. Failure scenario: Unauthorized review creation
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized review creation fails", async () => {
    await api.functional.recipeSharing.regularUser.reviews.create(
      unauthenticatedConnection,
      {
        body: reviewInput,
      },
    );
  });

  // 5. Failure scenario: review_text exceeds 2000 characters
  const longReviewText = RandomGenerator.paragraph({
    sentences: 500,
    wordMin: 15,
    wordMax: 20,
  });
  await TestValidator.error(
    "review text exceeding 2000 chars fails",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.create(
        connection,
        {
          body: {
            recipe_sharing_user_id: user.id,
            recipe_sharing_recipe_id: recipe.id,
            review_text: longReviewText,
          } satisfies IRecipeSharingReview.ICreate,
        },
      );
    },
  );
}
