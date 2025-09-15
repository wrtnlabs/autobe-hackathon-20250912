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

export async function test_api_review_vote_delete_success(
  connection: api.IConnection,
) {
  // 1. Regular user registration and authentication
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
    username: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a recipe by authenticated user
  const recipeCreateBody = {
    created_by_id: authorizedUser.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;

  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(recipe);
  TestValidator.equals(
    "recipe created - created_by_id matches user id",
    recipe.created_by_id,
    authorizedUser.id,
  );

  // 3. Create a review by the user for the recipe
  const reviewCreateBody = {
    recipe_sharing_user_id: authorizedUser.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRecipeSharingReview.ICreate;

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);
  TestValidator.equals(
    "review created - user id matches",
    review.recipe_sharing_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "review created - recipe id matches",
    review.recipe_sharing_recipe_id,
    recipe.id,
  );

  // 4. Create a helpfulness vote by the user for the review
  const voteCreateBody = {
    recipe_sharing_user_id: authorizedUser.id,
    recipe_sharing_review_id: review.id,
    helpful: true,
  } satisfies IRecipeSharingReviewVote.ICreate;

  const vote: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.create(
      connection,
      { reviewId: review.id, body: voteCreateBody },
    );
  typia.assert(vote);
  TestValidator.equals(
    "vote created - user id matches",
    vote.recipe_sharing_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "vote created - review id matches",
    vote.recipe_sharing_review_id,
    review.id,
  );
  TestValidator.predicate("vote helpful is true", vote.helpful === true);

  // 5. Retrieve votes by filter for the review to confirm vote presence
  const filterBody = {
    page: 1,
    limit: 10,
    filterByUserId: authorizedUser.id,
    filterByReviewId: review.id,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IRecipeSharingReviewVote.IRequest;

  const retrievedVotes =
    await api.functional.recipeSharing.regularUser.reviews.votes.index(
      connection,
      { reviewId: review.id, body: filterBody },
    );
  typia.assert(retrievedVotes);
  TestValidator.predicate(
    "retrieved votes include vote",
    retrievedVotes.data.some(
      (v) => v.id === vote.id && v.recipe_sharing_user_id === authorizedUser.id,
    ),
  );
  TestValidator.equals(
    "retrieved votes total count is 1",
    retrievedVotes.pagination.records,
    1,
  );
  TestValidator.equals(
    "retrieved votes data length is 1",
    retrievedVotes.data.length,
    1,
  );
}
