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
 * Test the successful update of a helpfulness vote on a recipe review.
 *
 * This test flows through a complete user scenario:
 *
 * 1. Register and authenticate a regular user.
 * 2. Create a recipe for this user.
 * 3. Create a review for the recipe.
 * 4. Create a helpfulness vote marking the review as helpful.
 * 5. Update the vote's helpful flag by re-creating the vote with new value.
 * 6. Query paged votes to confirm the update reflects correctly.
 *
 * The test validates proper API function usage, type safety, and business
 * logic. All responses are asserted with typia for strict runtime validation.
 * Descriptive assertions verify the expected state changes.
 *
 * Authentication is handled via real user join ensuring token management.
 * Random data is generated within constraints for realistic testing.
 */
export async function test_api_review_vote_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a regular user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(10),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Create a new recipe linked to the user
  const recipeCreateBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 15 }),
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
      body: recipeCreateBody,
    });
  typia.assert(recipe);

  // 3. Create a review for the created recipe by the user
  const reviewCreateBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingReview.ICreate;

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // 4. Create a helpfulness vote marking this review as helpful
  const voteCreateBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_review_id: review.id,
    helpful: true,
  } satisfies IRecipeSharingReviewVote.ICreate;

  const vote: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.create(
      connection,
      {
        reviewId: review.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);
  TestValidator.equals("vote indicates helpful is true", vote.helpful, true);

  // 5. Update the helpfulness vote by re-creating it with helpful = false
  const voteUpdateBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_review_id: review.id,
    helpful: false,
  } satisfies IRecipeSharingReviewVote.ICreate;

  const updatedVote: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.create(
      connection,
      {
        reviewId: review.id,
        body: voteUpdateBody,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "updated vote indicates helpful is false",
    updatedVote.helpful,
    false,
  );

  // 6. Retrieve paginated votes with PATCH API to confirm updated vote
  const pagedVotes: IPageIRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
          filterByUserId: user.id,
          filterByReviewId: review.id,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRecipeSharingReviewVote.IRequest,
      },
    );
  typia.assert(pagedVotes);
  TestValidator.predicate(
    "paged votes contains updated vote with helpful false",
    pagedVotes.data.some((v) => v.id === updatedVote.id && v.helpful === false),
  );
}
