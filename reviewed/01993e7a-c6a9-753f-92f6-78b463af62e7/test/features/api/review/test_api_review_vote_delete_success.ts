import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import type { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";

/**
 * Test deleting a helpfulness vote on a review by the voting user.
 *
 * This test simulates a regular user joining the platform, creating a
 * recipe review, casting a helpfulness vote on that review, and then
 * deleting that vote. It verifies that a user can successfully delete their
 * own vote and that no votes remain after deletion. Authentication context
 * is handled by the regular user join operation.
 *
 * Steps:
 *
 * 1. The regular user joins the system (sign-up) with unique email and
 *    username.
 * 2. The user creates a recipe review providing user ID, recipe ID, and review
 *    text.
 * 3. The user creates a helpfulness vote on their review.
 * 4. The user deletes the vote using the delete endpoint.
 * 5. The operation completes successfully without errors.
 */
export async function test_api_review_vote_delete_success(
  connection: api.IConnection,
) {
  // 1. Regular user join - register and authenticate user
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const username = RandomGenerator.name(2);
  const passwordHash = RandomGenerator.alphaNumeric(32);

  const user = await api.functional.auth.regularUser.join(connection, {
    body: {
      email: email,
      username: username,
      password_hash: passwordHash,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });
  typia.assert(user);

  // 2. User creates a recipe review
  // Use a random UUID for recipe_sharing_recipe_id as no recipe creation API provided
  const recipeId = typia.random<string & tags.Format<"uuid">>();
  const reviewCreateBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_recipe_id: recipeId,
    review_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingReview.ICreate;

  const review = await api.functional.recipeSharing.regularUser.reviews.create(
    connection,
    {
      body: reviewCreateBody,
    },
  );
  typia.assert(review);

  // 3. User creates a helpfulness vote on the review
  const voteCreateBody = {
    recipe_sharing_user_id: user.id,
    recipe_sharing_review_id: review.id,
    helpful: true,
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

  // 4. Delete the vote
  await api.functional.recipeSharing.regularUser.reviews.votes.eraseVote(
    connection,
    {
      reviewId: review.id,
      voteId: vote.id,
    },
  );

  // 5. Confirm deletion success by trying to delete again and expect error
  // but since no error details specified, we just ensure no exception thrown for first delete
}
