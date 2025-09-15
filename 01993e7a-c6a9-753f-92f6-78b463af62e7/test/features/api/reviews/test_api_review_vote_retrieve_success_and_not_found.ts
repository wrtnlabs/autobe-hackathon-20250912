import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import type { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";

/**
 * Validate retrieving a helpfulness vote details for a recipe sharing
 * review.
 *
 * This test covers:
 *
 * 1. Creating a regular user account by joining.
 * 2. Authenticating the regular user by logging in.
 * 3. Creating a recipe sharing review by the authenticated user.
 * 4. Creating a helpfulness vote on this review.
 * 5. Retrieving the vote by the review ID and vote ID and validating all
 *    fields.
 * 6. Attempting to retrieve a vote with a non-existent vote ID, expecting an
 *    error.
 * 7. Attempting to retrieve a vote with an invalid review ID, expecting an
 *    error.
 *
 * The test uses typia.assert to validate response type conformity and
 * TestValidator for business logic validations.
 *
 * All IDs and data conform to UUID format where applicable. Requests and
 * validations are awaited properly.
 */
export async function test_api_review_vote_retrieve_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Create regular user
  const username = RandomGenerator.name();
  const safeUsername =
    username.replace(/\s+/g, "") + RandomGenerator.alphaNumeric(4);
  const email = `${safeUsername.toLowerCase()}@example.com`;
  const password_hash = RandomGenerator.alphaNumeric(32);

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: email,
        password_hash: password_hash,
        username: safeUsername,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Login regular user
  const loginResult: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: {
        email: email,
        password_hash: password_hash,
      } satisfies IRecipeSharingRegularUser.ILogin,
    });
  typia.assert(loginResult);

  // 3. Create recipe sharing review
  const reviewText = RandomGenerator.paragraph({ sentences: 10 });

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: {
        recipe_sharing_user_id: user.id,
        recipe_sharing_recipe_id: typia.random<string & tags.Format<"uuid">>(),
        review_text: reviewText,
      } satisfies IRecipeSharingReview.ICreate,
    });
  typia.assert(review);

  // 4. Create helpfulness vote on review
  const voteHelpful = RandomGenerator.pick([true, false]);

  const vote: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.create(
      connection,
      {
        reviewId: review.id,
        body: {
          recipe_sharing_user_id: user.id,
          recipe_sharing_review_id: review.id,
          helpful: voteHelpful,
        } satisfies IRecipeSharingReviewVote.ICreate,
      },
    );
  typia.assert(vote);

  // 5. Retrieve the vote by reviewId and voteId
  const retrievedVote: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.at(
      connection,
      {
        reviewId: review.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);

  // Validate that the retrieved vote is the same as created vote
  TestValidator.equals(
    "retrievedVote.id equals created vote id",
    retrievedVote.id,
    vote.id,
  );
  TestValidator.equals(
    "retrievedVote.recipe_sharing_user_id equals user id",
    retrievedVote.recipe_sharing_user_id,
    user.id,
  );
  TestValidator.equals(
    "retrievedVote.recipe_sharing_review_id equals review id",
    retrievedVote.recipe_sharing_review_id,
    review.id,
  );
  TestValidator.equals(
    "retrievedVote.helpful equals vote helpful",
    retrievedVote.helpful,
    voteHelpful,
  );

  // 6. Attempt to retrieve vote with non-existent voteId
  await TestValidator.error(
    "retrieving vote with non-existent voteId throws error",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.votes.at(
        connection,
        {
          reviewId: review.id,
          voteId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Attempt to retrieve vote with invalid reviewId
  await TestValidator.error(
    "retrieving vote with invalid reviewId throws error",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.votes.at(
        connection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(),
          voteId: vote.id,
        },
      );
    },
  );
}
