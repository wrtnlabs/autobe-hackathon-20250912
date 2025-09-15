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
 * This E2E test conducts a full workflow to verify the pagination and
 * filtering of helpfulness votes on a recipe review.
 *
 * The workflow steps are:
 *
 * 1. Create a regular user (creator of the recipe and review).
 * 2. Login the first regular user.
 * 3. Create a recipe by the logged-in user.
 * 4. Post a review on the recipe by the same user.
 * 5. Create multiple other regular users who will vote on the review.
 * 6. Each voting user logs in and casts a helpful or not helpful vote on the
 *    review.
 * 7. Using the original user's authentication, request a paginated and
 *    filtered list of votes with sort parameters.
 * 8. Assert the correctness of pagination info, vote contents, and filtering
 *    behavior.
 *
 * The test ensures that voting and retrieval respects authenticated user
 * context, correctly handles pagination and sorting, and includes only
 * votes matching specified filters, all for the correct review ID.
 */
export async function test_api_review_vote_index_success(
  connection: api.IConnection,
) {
  // Step 1. Register primary regular user who will create the recipe and review
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // Step 2. Create a recipe authored by the user
  const recipeCreateBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreateBody,
    });
  typia.assert(recipe);

  // Step 3. User creates a review for the recipe
  const reviewCreateBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipe.id,
    review_text: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRecipeSharingReview.ICreate;
  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // Step 4. Create multiple other regular users who will vote on the review
  const voterCount = 5;
  const voters: IRecipeSharingRegularUser.IAuthorized[] = [];
  for (let i = 0; i < voterCount; i++) {
    const voterBody = {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password_hash: RandomGenerator.alphaNumeric(20),
      username: RandomGenerator.name(),
    } satisfies IRecipeSharingRegularUser.ICreate;
    const voter = await api.functional.auth.regularUser.join(connection, {
      body: voterBody,
    });
    typia.assert(voter);
    voters.push(voter);
  }

  // Step 5. Each voting user casts a helpfulness vote on the review
  for (let i = 0; i < voters.length; i++) {
    // We call join again with voter's credentials to simulate login
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: voters[i].email,
        password_hash: voters[i].password_hash,
        username: voters[i].username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
    const voteCreateBody = {
      recipe_sharing_user_id: voters[i].id,
      recipe_sharing_review_id: review.id,
      helpful: i % 2 === 0, // Alternate true/false helpful votes
    } satisfies IRecipeSharingReviewVote.ICreate;
    const vote =
      await api.functional.recipeSharing.regularUser.reviews.votes.create(
        connection,
        {
          reviewId: review.id,
          body: voteCreateBody,
        },
      );
    typia.assert(vote);
  }

  // Step 6. Re-authenticate as original user for vote indexing
  await api.functional.auth.regularUser.join(connection, {
    body: {
      email: user.email,
      password_hash: user.password_hash,
      username: user.username,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });

  // Step 7. Request paginated votes with helpful=true filter and sorted desc by created_at
  const pageRequest = {
    page: 1,
    limit: 3,
    sortBy: "created_at",
    sortOrder: "desc",
    filterByUserId: null,
    filterByReviewId: review.id,
  } satisfies IRecipeSharingReviewVote.IRequest;

  const pageResult: IPageIRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.index(
      connection,
      {
        reviewId: review.id,
        body: pageRequest,
      },
    );
  typia.assert(pageResult);

  // Step 8. Assert pagination metadata to ensure correctness
  TestValidator.predicate(
    "pagination total matches or exceeds vote count",
    pageResult.pagination.records >= voterCount,
  );
  TestValidator.equals(
    "pagination is on page 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 3", pageResult.pagination.limit, 3);

  // Step 9. Verify votes on this page belong to the review and helpful is true
  for (const vote of pageResult.data) {
    TestValidator.equals(
      "vote belongs to review",
      vote.recipe_sharing_review_id,
      review.id,
    );
    TestValidator.predicate("vote is helpful", vote.helpful === true);
  }

  // Step 10. Filter votes by user id to get that user's vote
  const filterUserId = voters[1].id;
  const userFilterRequest = {
    page: 1,
    limit: 10,
    sortBy: "updated_at",
    sortOrder: "asc",
    filterByUserId: filterUserId,
    filterByReviewId: review.id,
  } satisfies IRecipeSharingReviewVote.IRequest;

  const userVotes: IPageIRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.index(
      connection,
      {
        reviewId: review.id,
        body: userFilterRequest,
      },
    );
  typia.assert(userVotes);

  // All retrieved votes must be by the filtered user and belong to review
  for (const vote of userVotes.data) {
    TestValidator.equals(
      "filtered vote userId matches",
      vote.recipe_sharing_user_id,
      filterUserId,
    );
    TestValidator.equals(
      "filtered vote reviewId matches",
      vote.recipe_sharing_review_id,
      review.id,
    );
  }

  // Step 11. Fetch page 2 with smaller limit to verify pagination
  const page2Request = {
    page: 2,
    limit: 2,
    sortBy: "created_at",
    sortOrder: "desc",
    filterByUserId: null,
    filterByReviewId: review.id,
  } satisfies IRecipeSharingReviewVote.IRequest;

  const page2Result =
    await api.functional.recipeSharing.regularUser.reviews.votes.index(
      connection,
      {
        reviewId: review.id,
        body: page2Request,
      },
    );
  typia.assert(page2Result);

  TestValidator.equals(
    "pagination page number equals 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit equals 2",
    page2Result.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page 2 vote count is at most 2",
    page2Result.data.length <= 2,
  );

  // Verify votes on page 2 belong to review
  for (const vote of page2Result.data) {
    TestValidator.equals(
      "page 2 vote reviewId matches",
      vote.recipe_sharing_review_id,
      review.id,
    );
  }
}
