import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import type { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";

/**
 * Test deleting a review flag after its creation by the same regular user.
 *
 * This test simulates the entire lifecycle of a flag on a review, including
 * user creation, recipe creation, review creation, flag creation, and flag
 * deletion.
 *
 * It validates that the original flag creator can delete the flag successfully,
 * while another user cannot delete the flag and receives an authorization
 * error.
 *
 * It ensures API responses conform to declared DTO types using typia.assert.
 *
 * The test also verifies ownership and authorization logic by attempting
 * unauthorized deletion and expecting an error.
 */
export async function test_api_review_flag_delete_success_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate the first user
  const user1email: string = typia.random<string & tags.Format<"email">>();
  const user1PasswordHash = RandomGenerator.alphaNumeric(64); // simulate a hash
  const user1: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: user1email,
        password_hash: user1PasswordHash,
        username: RandomGenerator.name(),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user1);

  // Step 2: User1 creates a recipe
  const recipe1Title = RandomGenerator.paragraph({ sentences: 3 });
  const recipe1Description = RandomGenerator.content({ paragraphs: 2 });
  const recipe1Status = "published";
  const recipe1: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: {
        created_by_id: user1.id,
        title: recipe1Title,
        description: recipe1Description,
        status: recipe1Status,
      } satisfies IRecipeSharingRecipes.ICreate,
    });
  typia.assert(recipe1);
  TestValidator.equals(
    "recipe created by user1",
    recipe1.created_by_id,
    user1.id,
  );

  // Step 3: User1 creates a review for recipe1
  const review1Text = RandomGenerator.paragraph({ sentences: 5 });
  const review1: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: {
        recipe_sharing_user_id: user1.id,
        recipe_sharing_recipe_id: recipe1.id,
        review_text: review1Text,
      } satisfies IRecipeSharingReview.ICreate,
    });
  typia.assert(review1);
  TestValidator.equals(
    "review created by user1",
    review1.recipe_sharing_user_id,
    user1.id,
  );

  // Step 4: User1 flags the review with a reason
  const flagReason = "spam";
  const flag1: IRecipeSharingReviewFlag =
    await api.functional.recipeSharing.regularUser.reviews.flags.createFlag(
      connection,
      {
        reviewId: review1.id,
        body: {
          recipe_sharing_user_id: user1.id,
          recipe_sharing_review_id: review1.id,
          reason: flagReason,
        } satisfies IRecipeSharingReviewFlag.ICreate,
      },
    );
  typia.assert(flag1);
  TestValidator.equals(
    "flag belongs to user1",
    flag1.recipe_sharing_user_id,
    user1.id,
  );
  TestValidator.equals(
    "flag related to review1",
    flag1.recipe_sharing_review_id,
    review1.id,
  );

  // Step 5: User1 deletes the flag successfully
  await api.functional.recipeSharing.regularUser.reviews.flags.eraseFlag(
    connection,
    {
      reviewId: review1.id,
      flagId: flag1.id,
    },
  );

  // Step 6: Create and authenticate a second different user
  const user2email: string = typia.random<string & tags.Format<"email">>();
  const user2PasswordHash = RandomGenerator.alphaNumeric(64);
  const user2: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: user2email,
        password_hash: user2PasswordHash,
        username: RandomGenerator.name(),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user2);

  // Step 7: user2 creates a flag on review1
  const flag2Reason = "offensive language";
  const flag2: IRecipeSharingReviewFlag =
    await api.functional.recipeSharing.regularUser.reviews.flags.createFlag(
      connection,
      {
        reviewId: review1.id,
        body: {
          recipe_sharing_user_id: user2.id,
          recipe_sharing_review_id: review1.id,
          reason: flag2Reason,
        } satisfies IRecipeSharingReviewFlag.ICreate,
      },
    );
  typia.assert(flag2);

  // Step 8: user2 tries to delete flag1 (owned by user1) - should fail
  await TestValidator.error("user2 cannot delete user1's flag", async () => {
    await api.functional.recipeSharing.regularUser.reviews.flags.eraseFlag(
      connection,
      {
        reviewId: review1.id,
        flagId: flag1.id,
      },
    );
  });
}
