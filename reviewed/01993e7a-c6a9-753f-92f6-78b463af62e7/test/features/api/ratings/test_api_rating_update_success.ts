import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Verify updating an existing rating by id for authenticated regularUser.
 *
 * The test first registers two distinct regular users with unique emails and
 * usernames. Then it creates a rating for a simulated recipe associated with
 * the first user. Next it updates the star rating value of that existing rating
 * and validates the update operation by retrieving the updated rating entity
 * and asserting correctness.
 *
 * This verifies user authentication, rating creation, update flow, and correct
 * usage of UUIDs and rating constraints.
 */
export async function test_api_rating_update_success(
  connection: api.IConnection,
) {
  // 1. Register first regular user (userA) and authenticate
  const userACreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const userA: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userACreate,
    });
  typia.assert(userA);

  // 2. Register second regular user (userB) to ensure isolate authentication
  const userBCreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const userB: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userBCreate,
    });
  typia.assert(userB);

  // 3. Use userA context (already authenticated by join call) to create a rating
  //    Use a random UUID for recipe_sharing_recipe_id to simulate recipe
  const recipeId = typia.random<string & tags.Format<"uuid">>();

  const ratingCreate = {
    recipe_sharing_user_id: userA.id,
    recipe_sharing_recipe_id: recipeId,
    rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
  } satisfies IRecipeSharingRating.ICreate;

  const createdRating: IRecipeSharingRating =
    await api.functional.recipeSharing.regularUser.ratings.create(connection, {
      body: ratingCreate,
    });
  typia.assert(createdRating);
  TestValidator.equals(
    "rating user ID matches userA.id",
    createdRating.recipe_sharing_user_id,
    userA.id,
  );

  // 4. Prepare updated rating DTO with a different rating value (1-5 but not original)
  const newRatingValue = ArrayUtil.repeat(5, (i) => i + 1).filter(
    (v) => v !== createdRating.rating,
  ) as number[];
  const updateRatingValue = RandomGenerator.pick(
    newRatingValue,
  ) satisfies number & tags.Type<"int32">;

  const ratingUpdate = {
    rating: updateRatingValue,
  } satisfies IRecipeSharingRating.IUpdate;

  // 5. Execute update API with created rating id
  const updatedRating: IRecipeSharingRating =
    await api.functional.recipeSharing.regularUser.ratings.update(connection, {
      id: createdRating.id,
      body: ratingUpdate,
    });
  typia.assert(updatedRating);

  // 6. Validate that updated rating matches new rating value
  TestValidator.equals(
    "updated rating value should match expected",
    updatedRating.rating,
    updateRatingValue,
  );
  TestValidator.equals(
    "updated rating ID unchanged",
    updatedRating.id,
    createdRating.id,
  );
  TestValidator.equals(
    "updated rating user ID unchanged",
    updatedRating.recipe_sharing_user_id,
    userA.id,
  );
}
