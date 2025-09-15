import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import type { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";

/**
 * Test updating a review flag with valid data including authorization.
 *
 * This test validates the full business flow for creating a recipe sharing
 * regular user account, creating a recipe, posting a review, flagging the
 * review, and updating the flag's reason.
 *
 * It also tests unauthorized update attempts by a different user.
 *
 * Workflow:
 *
 * 1. Join regular user
 * 2. Create recipe for user
 * 3. Create review for recipe
 * 4. Create a flag on the review
 * 5. Update the flag's reason successfully
 * 6. Assert updated flag data
 * 7. Join a different regular user
 * 8. Attempt unauthorized flag update - expect failure
 */
export async function test_api_review_flag_update_success_with_authentication(
  connection: api.IConnection,
) {
  // 1) Regular user joins
  const regularUserBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserBody,
    });
  typia.assert(regularUser);

  // 2) Create a recipe for this user
  const recipeCreateBody = {
    created_by_id: regularUser.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(recipe);

  // 3) Create a review for the recipe by the user
  const reviewCreateBody = {
    recipe_sharing_user_id: regularUser.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRecipeSharingReview.ICreate;
  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // 4) Create a flag on the review by the same user
  const flagCreateBody = {
    recipe_sharing_user_id: regularUser.id,
    recipe_sharing_review_id: review.id,
    reason: "spam",
  } satisfies IRecipeSharingReviewFlag.ICreate;
  const flag: IRecipeSharingReviewFlag =
    await api.functional.recipeSharing.regularUser.reviews.flags.createFlag(
      connection,
      {
        reviewId: review.id,
        body: flagCreateBody,
      },
    );
  typia.assert(flag);

  // 5) Update the flag reason to a new valid reason
  const flagUpdateBody = {
    reason: "offensive content",
  } satisfies IRecipeSharingReviewFlag.IUpdate;
  const updatedFlag: IRecipeSharingReviewFlag =
    await api.functional.recipeSharing.regularUser.reviews.flags.updateFlag(
      connection,
      {
        reviewId: review.id,
        flagId: flag.id,
        body: flagUpdateBody,
      },
    );
  typia.assert(updatedFlag);

  // 6) Validate that the flag was updated correctly
  TestValidator.equals(
    "Flag ID remains the same after update",
    updatedFlag.id,
    flag.id,
  );
  TestValidator.equals(
    "Flag reason updated successfully",
    updatedFlag.reason,
    flagUpdateBody.reason,
  );
  TestValidator.equals(
    "Flag user ID remains consistent",
    updatedFlag.recipe_sharing_user_id,
    flagCreateBody.recipe_sharing_user_id,
  );
  TestValidator.equals(
    "Flag review ID remains consistent",
    updatedFlag.recipe_sharing_review_id,
    review.id,
  );

  // 7) Another different user joins
  const otherUserBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const otherUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: otherUserBody,
    });
  typia.assert(otherUser);

  // 8) Attempt unauthorized update of flag by different user - should throw error
  await TestValidator.error(
    "Unauthorized user cannot update another user's flag",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.flags.updateFlag(
        connection,
        {
          reviewId: review.id,
          flagId: flag.id,
          body: {
            reason: "abusive",
          } satisfies IRecipeSharingReviewFlag.IUpdate,
        },
      );
    },
  );
}
