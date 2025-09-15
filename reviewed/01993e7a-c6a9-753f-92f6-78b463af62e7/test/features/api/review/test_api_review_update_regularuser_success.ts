import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * Test updating an existing recipe sharing review by its ID as a regular
 * user.
 *
 * This test performs the entire business scenario for review update,
 * including:
 *
 * 1. Signing up a new regular user and authenticating that user.
 * 2. Creating a new recipe belonging to that user.
 * 3. Creating a new review authored by that user for the recipe.
 * 4. Updating the review with new content and asserting the update.
 * 5. Validating that the review text and timestamps have updated correctly.
 * 6. Negative tests including unauthorized update attempts, update with
 *    invalid review ID, and attempts to update deleted reviews.
 *
 * All steps use valid DTOs and API functions with proper TypeScript typing,
 * random test data generation, and comprehensive validation with typia and
 * TestValidator.
 *
 * This ensures the correctness and security of the review update
 * functionality.
 */
export async function test_api_review_update_regularuser_success(
  connection: api.IConnection,
) {
  // 1. Sign up and authenticate a regular user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPasswordHash = RandomGenerator.alphaNumeric(32);
  const username: string = RandomGenerator.name(2);

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: userEmail,
        password_hash: userPasswordHash,
        username: username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a recipe
  const recipeTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const recipeDescription: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 4,
    sentenceMax: 7,
    wordMin: 3,
    wordMax: 6,
  });
  const recipeStatus = "published";

  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: {
        created_by_id: user.id,
        title: recipeTitle,
        description: recipeDescription,
        status: recipeStatus,
      } satisfies IRecipeSharingRecipes.ICreate,
    });
  typia.assert(recipe);

  // 3. Create a review for the recipe by the user
  const initialReviewText: string = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: {
        recipe_sharing_user_id: user.id,
        recipe_sharing_recipe_id: recipe.id,
        review_text: initialReviewText,
      } satisfies IRecipeSharingReview.ICreate,
    });
  typia.assert(review);

  // 4. Update the review with new text
  const updatedReviewText: string = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 10,
  });

  const updatedReview: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.update(connection, {
      id: review.id,
      body: {
        review_text: updatedReviewText,
      } satisfies IRecipeSharingReview.IUpdate,
    });
  typia.assert(updatedReview);

  // Validate update changed text and timestamps
  TestValidator.equals(
    "updated review text should differ",
    updatedReview.review_text !== review.review_text,
    true,
  );

  TestValidator.predicate(
    "updated review updated_at is later than original",
    new Date(updatedReview.updated_at) > new Date(review.updated_at),
  );

  TestValidator.equals(
    "updated review id matches original",
    updatedReview.id,
    review.id,
  );

  TestValidator.equals(
    "updated review user id matches",
    updatedReview.recipe_sharing_user_id,
    user.id,
  );

  TestValidator.equals(
    "updated review recipe id matches",
    updatedReview.recipe_sharing_recipe_id,
    recipe.id,
  );

  // 5. Negative tests
  // 5.1. Unauthorized user tries to update review
  // Create second user
  const badUserEmail: string = typia.random<string & tags.Format<"email">>();
  const badUserPasswordHash = RandomGenerator.alphaNumeric(32);
  const badUsername: string = RandomGenerator.name(2);
  const badUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: badUserEmail,
        password_hash: badUserPasswordHash,
        username: badUsername,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(badUser);

  // Attempt unauthorized update using badUser context
  await api.functional.auth.regularUser.join(connection, {
    body: {
      email: badUserEmail,
      password_hash: badUserPasswordHash,
      username: badUsername,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });

  // Simulate login switch by renewing auth token in connection headers
  // (Assuming join sets connection.headers.Authorization automatically)
  // Now try updating review with bad user auth token (unauthorized)
  await TestValidator.error(
    "unauthorized user update should fail",
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

  // 5.2. Update with invalid review id
  await TestValidator.error(
    "update with invalid review id should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            review_text: "Attempt update with invalid id",
          } satisfies IRecipeSharingReview.IUpdate,
        },
      );
    },
  );

  // 5.3. Update deleted review
  // Soft delete the review by updating deleted_at
  const deletionDate = new Date().toISOString();
  const deletedReview: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.update(connection, {
      id: review.id,
      body: {
        deleted_at: deletionDate,
      } satisfies IRecipeSharingReview.IUpdate,
    });
  typia.assert(deletedReview);
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedReview.deleted_at === deletionDate,
  );

  // Now attempt update after deletion
  await TestValidator.error("update deleted review should fail", async () => {
    await api.functional.recipeSharing.regularUser.reviews.update(connection, {
      id: review.id,
      body: {
        review_text: "Update after deletion",
      } satisfies IRecipeSharingReview.IUpdate,
    });
  });
}
