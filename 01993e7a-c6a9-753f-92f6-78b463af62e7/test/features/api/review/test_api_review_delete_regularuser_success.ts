import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * Test deleting an existing recipe sharing review as a regular user by its ID.
 *
 * This test covers the full flow from user registration, recipe creation,
 * review creation, and finally review deletion with validation of idempotency
 * and authorization.
 *
 * It ensures the review deletion endpoint correctly removes the record and
 * rejects unauthorized or unauthenticated deletion attempts.
 *
 * Steps:
 *
 * 1. Register a regular user.
 * 2. Create a recipe by the user.
 * 3. Create a review by the user for the recipe.
 * 4. Delete the review successfully.
 * 5. Verify deletion by attempting to delete again and expecting failure.
 * 6. Verify deleting a random non-existent review ID fails.
 * 7. Verify unauthenticated review deletion fails.
 * 8. Register another user and create a review, then verify unauthorized deletion
 *    of first review fails.
 */
export async function test_api_review_delete_regularuser_success(
  connection: api.IConnection,
) {
  // 1. Regular user registration
  const email = `${RandomGenerator.alphaNumeric(10)}@test.example`;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: email,
        password_hash: RandomGenerator.alphaNumeric(64),
        username: RandomGenerator.name(1),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Recipe creation by the regular user
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: {
        created_by_id: user.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "draft",
      } satisfies IRecipeSharingRecipes.ICreate,
    });
  typia.assert(recipe);

  // 3. Review creation by the regular user for the recipe
  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: {
        recipe_sharing_user_id: user.id,
        recipe_sharing_recipe_id: recipe.id,
        review_text: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies IRecipeSharingReview.ICreate,
    });
  typia.assert(review);

  // 4a. Delete the created review by its ID (should succeed)
  await api.functional.recipeSharing.regularUser.reviews.erase(connection, {
    id: review.id,
  });

  // 5a. Attempt to delete the same review again (should error)
  await TestValidator.error(
    "deleting already deleted review should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.erase(connection, {
        id: review.id,
      });
    },
  );

  // 6a. Attempt to delete a non-existent review ID (random UUID)
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  if (randomNonExistentId !== review.id) {
    await TestValidator.error(
      "deleting non-existent review id should fail",
      async () => {
        await api.functional.recipeSharing.regularUser.reviews.erase(
          connection,
          {
            id: randomNonExistentId,
          },
        );
      },
    );
  }

  // 7a. Attempt to delete a review without authentication (unauthenticated connection) - should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "deleting review without authentication should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.erase(
        unauthenticatedConnection,
        {
          id: review.id,
        },
      );
    },
  );

  // 8a. Attempt to delete review by another unauthorized user (should fail)
  // Register a different regular user
  const otherEmail = `${RandomGenerator.alphaNumeric(10)}@test.other`;
  const otherUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: otherEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
        username: RandomGenerator.name(1),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(otherUser);

  // Create another review by other user for same recipe for deletion by other
  const otherReview: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: {
        recipe_sharing_user_id: otherUser.id,
        recipe_sharing_recipe_id: recipe.id,
        review_text: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRecipeSharingReview.ICreate,
    });
  typia.assert(otherReview);

  // Attempt unauthorized deletion of first user's review
  await TestValidator.error(
    "unauthorized user deleting other's review should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.erase(connection, {
        id: review.id,
      });
    },
  );
}
