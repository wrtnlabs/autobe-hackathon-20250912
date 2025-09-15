import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * Test updating an existing recipe sharing review by its ID as a premium
 * user.
 *
 * This test encompasses a full business workflow verifying that a premium
 * user can create, update, and view reviews on recipes. It includes
 * multi-role authentication handling and negative cases for unauthorized
 * access and non-existent resource updates.
 *
 * The process involves:
 *
 * 1. Creating and authenticating a premium user
 * 2. Creating and authenticating a regular user
 * 3. Creating a recipe by the regular user
 * 4. Creating a review for the recipe by the premium user
 * 5. Updating the review's text as the premium user
 * 6. Verifying the update correctness
 * 7. Negative test: attempt to update without authentication
 * 8. Negative test: attempt to update a non-existent review
 * 9. Clean role switching with authenticated users
 *
 * All API responses are asserted for type integrity and business
 * correctness.
 */
export async function test_api_review_update_premiumuser_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a premium user
  const premiumUserCreateBody = {
    email: `premium${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreateBody,
    });
  typia.assert(premiumUser);

  // Step 2: Create and authenticate a regular user
  const regularUserCreateBody = {
    email: `regular${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // Step 3: Create a recipe by the regular user
  const recipeCreateBody = {
    created_by_id: regularUser.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(recipe);

  // Step 4: Create a review for the recipe by the premium user
  const reviewCreateBody = {
    recipe_sharing_user_id: premiumUser.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRecipeSharingReview.ICreate;
  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.premiumUser.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // Step 5: Update the review's text as the premium user
  const updatedReviewText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 6,
    sentenceMax: 12,
    wordMin: 6,
    wordMax: 12,
  });
  const reviewUpdateBody = {
    review_text: updatedReviewText,
  } satisfies IRecipeSharingReview.IUpdate;
  const updatedReview: IRecipeSharingReview =
    await api.functional.recipeSharing.premiumUser.reviews.update(connection, {
      id: review.id,
      body: reviewUpdateBody,
    });
  typia.assert(updatedReview);

  // Validate that the updated review text matches
  TestValidator.equals(
    "updated review text should match",
    updatedReview.review_text,
    updatedReviewText,
  );

  // Step 6: Negative test: Attempt update without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "update review without authentication should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.reviews.update(
        unauthenticatedConnection,
        {
          id: review.id,
          body: reviewUpdateBody,
        },
      );
    },
  );

  // Step 7: Negative test: Attempt update for non-existent review ID
  await TestValidator.error(
    "update review with non-existent ID should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.reviews.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: reviewUpdateBody,
        },
      );
    },
  );
}
