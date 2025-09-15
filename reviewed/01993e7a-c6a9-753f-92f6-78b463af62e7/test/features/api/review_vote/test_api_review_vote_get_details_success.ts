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
 * Test the successful retrieval of detailed information for a specific
 * helpfulness vote on a recipe review.
 *
 * This test covers the entire flow starting from user registration, recipe
 * creation, review creation, vote creation, and finally fetching the vote
 * details filtered by review ID and user ID.
 *
 * The validation ensures the vote detail returned from the API matches the
 * created vote's properties. Authentication tokens handling and type safety
 * assertions are applied throughout to guarantee correctness.
 */
export async function test_api_review_vote_get_details_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new regular user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Create a recipe linked to the created user
  const createRecipeBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;

  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: createRecipeBody,
    });
  typia.assert(recipe);

  // 3. Create a review for the recipe by the user
  const createReviewBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies IRecipeSharingReview.ICreate;

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: createReviewBody,
    });
  typia.assert(review);

  // 4. Create a helpfulness vote for the created review by the user
  const voteHelpful = true;
  const createVoteBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_review_id: review.id,
    helpful: voteHelpful,
  } satisfies IRecipeSharingReviewVote.ICreate;

  const vote: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.create(
      connection,
      {
        reviewId: review.id,
        body: createVoteBody,
      },
    );
  typia.assert(vote);

  // 5. Retrieve detailed vote information filtered by reviewId and userId
  const filterRequest = {
    page: 1,
    limit: 1,
    sortBy: "created_at",
    sortOrder: "asc",
    filterByReviewId: review.id,
    filterByUserId: user.id,
  } satisfies IRecipeSharingReviewVote.IRequest;

  const votePage: IPageIRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.index(
      connection,
      {
        reviewId: review.id,
        body: filterRequest,
      },
    );
  typia.assert(votePage);

  // Validate that exactly one vote is returned
  TestValidator.equals(
    "votePage.data length should be 1",
    votePage.data.length,
    1,
  );

  // Validate the returned vote matches the created vote and user properties
  const returnedVote = votePage.data[0];

  TestValidator.equals(
    "returned vote id matches created vote",
    returnedVote.id,
    vote.id,
  );

  TestValidator.equals(
    "returned vote user id matches created user",
    returnedVote.recipe_sharing_user_id,
    user.id,
  );

  TestValidator.equals(
    "returned vote review id matches created review",
    returnedVote.recipe_sharing_review_id,
    review.id,
  );

  TestValidator.equals(
    "returned vote helpful flag matches created helpful",
    returnedVote.helpful,
    voteHelpful,
  );
}
