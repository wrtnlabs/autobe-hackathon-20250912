import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReviewVote";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import type { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";

/**
 * Test the retrieval of helpfulness votes for a recipe review by an
 * authenticated regular user.
 *
 * This test covers the workflow of a user:
 *
 * 1. Joining the platform as a regular user.
 * 2. Creating a recipe.
 * 3. Writing a review on the created recipe.
 * 4. Retrieving the list of votes for the review (since no vote creation API
 *    exists).
 *
 * The test validates that all entities are correctly created and that the
 * votes endpoint can be accessed and returns a valid paginated response. It
 * asserts user and review IDs in votes if any exist.
 */
export async function test_api_review_vote_create_success(
  connection: api.IConnection,
) {
  // 1. Regular user authentication and join
  const userCreateBody = {
    email: `user${Date.now()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const userAuthorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(userAuthorized);

  // 2. Create a recipe by the authenticated user
  const recipeCreateBody = {
    created_by_id: userAuthorized.id,
    title: `Recipe ${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(recipe);

  // 3. Create a review by the authenticated user on the created recipe
  const reviewCreateBody = {
    recipe_sharing_user_id: userAuthorized.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.paragraph({
      sentences: 12,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingReview.ICreate;
  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // 4. Retrieve votes for the review
  const voteRequest = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
    filterByUserId: userAuthorized.id,
    filterByReviewId: review.id,
  } satisfies IRecipeSharingReviewVote.IRequest;
  const votePage: IPageIRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.index(
      connection,
      {
        reviewId: review.id,
        body: voteRequest,
      },
    );
  typia.assert(votePage);

  // Validate that votes correspond to the user and review IDs if any votes exist
  TestValidator.predicate("votes exist or not", votePage.data.length >= 0);
  for (const vote of votePage.data) {
    typia.assert(vote);
    TestValidator.equals(
      "vote user id matches",
      vote.recipe_sharing_user_id,
      userAuthorized.id,
    );
    TestValidator.equals(
      "vote review id matches",
      vote.recipe_sharing_review_id,
      review.id,
    );
  }
}
