import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import type { IRecipeSharingReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewVote";

export async function test_api_review_vote_update_success_and_errors(
  connection: api.IConnection,
) {
  // Step 1: Join a regular user
  const userCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Login the created user
  const loginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 3: Create a recipe sharing review
  const reviewCreateBody = {
    recipe_sharing_user_id: authorizedUser.id,
    recipe_sharing_recipe_id: typia.random<string & tags.Format<"uuid">>(),
    review_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRecipeSharingReview.ICreate;

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // Step 4: Create a helpfulness vote for the review
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

  // Step 5: Update the vote's helpfulness to false
  const voteUpdateBody = {
    helpful: false,
  } satisfies IRecipeSharingReviewVote.IUpdate;

  const updatedVote: IRecipeSharingReviewVote =
    await api.functional.recipeSharing.regularUser.reviews.votes.updateVote(
      connection,
      { reviewId: review.id, voteId: vote.id, body: voteUpdateBody },
    );
  typia.assert(updatedVote);
  TestValidator.equals("vote id after update", updatedVote.id, vote.id);
  TestValidator.equals(
    "vote helpfulness should be false",
    updatedVote.helpful,
    false,
  );

  // Step 6: Attempt to update a vote with invalid voteId (expecting error)
  await TestValidator.error(
    "updating vote with invalid voteId should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.votes.updateVote(
        connection,
        {
          reviewId: review.id,
          voteId: typia.random<string & tags.Format<"uuid">>(), // random, not existing
          body: {
            helpful: true,
          } satisfies IRecipeSharingReviewVote.IUpdate,
        },
      );
    },
  );

  // Step 7: Create and login another user, attempt to update the original vote (expect error)
  const anotherUserCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const anotherAuthorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: anotherUserCreateBody,
    });
  typia.assert(anotherAuthorizedUser);

  const anotherLoginBody = {
    email: anotherUserCreateBody.email,
    password_hash: anotherUserCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const anotherLoggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: anotherLoginBody,
    });
  typia.assert(anotherLoggedInUser);

  // Attempt update by another user (unauthorized)
  await TestValidator.error(
    "updating vote by unauthorized user should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.votes.updateVote(
        connection,
        {
          reviewId: review.id,
          voteId: vote.id,
          body: {
            helpful: true,
          } satisfies IRecipeSharingReviewVote.IUpdate,
        },
      );
    },
  );
}
