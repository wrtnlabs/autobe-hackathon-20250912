import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

export async function test_api_review_create_premiumuser_success(
  connection: api.IConnection,
) {
  // Step 1: Register new premium user and authenticate
  const premiumUserBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserBody,
    });
  typia.assert(premiumUser);

  // Step 2: Create a new recipe for the premium user
  const recipeBody = {
    created_by_id: premiumUser.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeBody,
    });
  typia.assert(recipe);

  // Step 3: Create a review for the recipe
  const reviewBody = {
    recipe_sharing_user_id: premiumUser.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IRecipeSharingReview.ICreate;

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.premiumUser.reviews.create(connection, {
      body: reviewBody,
    });
  typia.assert(review);

  // Step 4: Validate the review fields
  TestValidator.equals(
    "Review user ID matches premium user",
    review.recipe_sharing_user_id,
    premiumUser.id,
  );
  TestValidator.equals(
    "Review recipe ID matches created recipe",
    review.recipe_sharing_recipe_id,
    recipe.id,
  );
  TestValidator.predicate(
    "Review text length within limits",
    review.review_text.length <= 2000 && review.review_text.length > 0,
  );
  TestValidator.predicate(
    "Review has valid created_at timestamp",
    typeof review.created_at === "string" && review.created_at.length > 0,
  );
  TestValidator.predicate(
    "Review has valid updated_at timestamp",
    typeof review.updated_at === "string" && review.updated_at.length > 0,
  );
  TestValidator.predicate(
    "Review deleted_at is null or undefined",
    review.deleted_at === null || review.deleted_at === undefined,
  );
}
