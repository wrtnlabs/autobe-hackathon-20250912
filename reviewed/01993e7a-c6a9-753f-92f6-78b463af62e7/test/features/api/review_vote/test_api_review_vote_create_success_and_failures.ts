import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import type { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";

/**
 * Test creating a helpfulness vote on a specific review. Verify successful
 * creation with valid review ID, user ID, and helpful boolean flag. Test
 * failure scenarios including voting multiple times by the same user,
 * unauthorized users, or invalid review IDs.
 */
export async function test_api_review_vote_create_success_and_failures(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first regular user
  const user1Body = {
    email: `user1_${typia.random<string & tags.Format<"email">>()}`,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user1: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: user1Body,
    });
  typia.assert(user1);

  // Step 2: Create a review with first user
  const reviewBody = {
    recipe_sharing_user_id: user1.id,
    recipe_sharing_recipe_id: typia.random<string & tags.Format<"uuid">>(),
    review_text: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IRecipeSharingReview.ICreate;
  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewBody,
    });
  typia.assert(review);

  // Step 3: Successful vote creation by first user
  const voteBody1 = {
    recipe_sharing_user_id: user1.id,
    recipe_sharing_review_id: review.id,
    helpful: true,
  } satisfies IRecipeSharingReviewVote.ICreate;
  const vote1: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.create(
      connection,
      {
        reviewId: review.id,
        body: voteBody1,
      },
    );
  typia.assert(vote1);

  // Step 4: Failure on duplicate vote by same user
  await TestValidator.error(
    "should not allow duplicate votes by the same user",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.votes.create(
        connection,
        {
          reviewId: review.id,
          body: voteBody1,
        },
      );
    },
  );

  // Step 5: Create and authenticate second regular user
  const user2Body = {
    email: `user2_${typia.random<string & tags.Format<"email">>()}`,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user2: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: user2Body,
    });
  typia.assert(user2);

  // Step 6: Successful vote creation by second user
  const voteBody2 = {
    recipe_sharing_user_id: user2.id,
    recipe_sharing_review_id: review.id,
    helpful: false,
  } satisfies IRecipeSharingReviewVote.ICreate;
  const vote2: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.create(
      connection,
      {
        reviewId: review.id,
        body: voteBody2,
      },
    );
  typia.assert(vote2);

  // Step 7: Failure when voting on non-existent review ID
  await TestValidator.error(
    "should not allow voting on non-existent review ID",
    async () => {
      const fakeReviewId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.recipeSharing.regularUser.reviews.votes.create(
        connection,
        {
          reviewId: fakeReviewId,
          body: {
            recipe_sharing_user_id: user2.id,
            recipe_sharing_review_id: fakeReviewId,
            helpful: true,
          } satisfies IRecipeSharingReviewVote.ICreate,
        },
      );
    },
  );
}
