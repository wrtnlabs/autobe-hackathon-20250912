import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * Test updating an existing recipe review by review ID.
 *
 * This test validates the ability for an authorized regular user to update
 * their own recipe review's text content successfully.
 *
 * It also verifies failure cases including unauthorized update attempts by
 * other users, updates to non-existent review IDs, and invalid content.
 *
 * Test steps:
 *
 * 1. Register and authenticate a regular user.
 * 2. Create a recipe review associated with that user.
 * 3. Successfully update the review text by the owning user.
 * 4. Confirm that the updated review text matches the expected value.
 * 5. Test invalid update with empty review text expecting an error.
 * 6. Test update attempt on a non-existent review ID expecting an error.
 * 7. Register a second regular user.
 * 8. Attempt to update the first user's review by the second user expecting an
 *    authorization error.
 */
export async function test_api_recipe_review_update_success_and_failures(
  connection: api.IConnection,
) {
  // 1. Regular user registration and authentication
  const userEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const userPasswordHash = RandomGenerator.alphaNumeric(16);
  const userUsername = RandomGenerator.name(1);

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: userEmail,
        password_hash: userPasswordHash,
        username: userUsername,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a recipe review tied to the user for update testing
  // Use a valid random UUID for recipe_sharing_recipe_id
  const recipeId = typia.random<string & tags.Format<"uuid">>();
  const initialReviewText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: {
        recipe_sharing_user_id: user.id,
        recipe_sharing_recipe_id: recipeId,
        review_text: initialReviewText,
      } satisfies IRecipeSharingReview.ICreate,
    });
  typia.assert(review);

  // 3. Successfully update the review's text by the review owner
  const updatedReviewText = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 4,
    wordMax: 8,
  });

  const updatedReview: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.update(connection, {
      id: review.id,
      body: {
        review_text: updatedReviewText,
      } satisfies IRecipeSharingReview.IUpdate,
    });
  typia.assert(updatedReview);

  // Validate updated review
  TestValidator.equals(
    "updated review text matches input",
    updatedReview.review_text,
    updatedReviewText,
  );
  TestValidator.equals(
    "updated review id matches original",
    updatedReview.id,
    review.id,
  );

  // 4. Test failure: update with invalid content (empty review text)
  await TestValidator.error(
    "update with empty review text should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.update(
        connection,
        {
          id: review.id,
          body: {
            review_text: "",
          } satisfies IRecipeSharingReview.IUpdate,
        },
      );
    },
  );

  // 5. Test failure: update attempt with non-existent review ID
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with non-existent review ID should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.update(
        connection,
        {
          id: nonExistentReviewId,
          body: {
            review_text: "Attempt update on non-existent ID",
          } satisfies IRecipeSharingReview.IUpdate,
        },
      );
    },
  );

  // 6. Register a second regular user for unauthorized update attempt
  const otherUserEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const otherUserPasswordHash = RandomGenerator.alphaNumeric(16);
  const otherUserUsername = RandomGenerator.name(1);

  const otherUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: otherUserEmail,
        password_hash: otherUserPasswordHash,
        username: otherUserUsername,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(otherUser);

  // 7. Switch authentication context to the second user
  await api.functional.auth.regularUser.join(connection, {
    body: {
      email: otherUserEmail,
      password_hash: otherUserPasswordHash,
      username: otherUserUsername,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });

  // 8. Unauthorized user attempts to update the first user's review
  await TestValidator.error(
    "unauthorized user cannot update other's review",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.update(
        connection,
        {
          id: review.id,
          body: {
            review_text: "Unauthorized update attempt",
          } satisfies IRecipeSharingReview.IUpdate,
        },
      );
    },
  );
}
