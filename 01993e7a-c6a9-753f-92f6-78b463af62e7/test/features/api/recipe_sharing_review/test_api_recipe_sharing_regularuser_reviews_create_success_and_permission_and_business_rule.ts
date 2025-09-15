import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * Tests for the recipe sharing regular user reviews create API.
 *
 * This test covers:
 *
 * 1. Successful review creation by an authenticated user.
 * 2. Permission enforcement for unauthenticated requests.
 * 3. Business rule validation preventing duplicate reviews by the same user on the
 *    same recipe.
 */
export async function test_api_recipe_sharing_regularuser_reviews_create_success_and_permission_and_business_rule(
  connection: api.IConnection,
) {
  // Step 1: User registration to join as a regular user
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const createdUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  // Step 2: Log in as the created regular user to get authentication context
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loginUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loginUser);

  // Step 3: Successful creation of a new review
  // Prepare valid review creation body
  const reviewCreateBody = {
    recipe_sharing_user_id: createdUser.id,
    recipe_sharing_recipe_id: typia.random<string & tags.Format<"uuid">>(),
    review_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRecipeSharingReview.ICreate;

  const createdReview: IRecipeSharingReview =
    await api.functional.recipeSharing.regularUser.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(createdReview);

  TestValidator.equals(
    "created review user id matches",
    createdReview.recipe_sharing_user_id,
    reviewCreateBody.recipe_sharing_user_id,
  );

  TestValidator.equals(
    "created review recipe id matches",
    createdReview.recipe_sharing_recipe_id,
    reviewCreateBody.recipe_sharing_recipe_id,
  );

  TestValidator.equals(
    "created review text matches",
    createdReview.review_text,
    reviewCreateBody.review_text,
  );

  TestValidator.predicate(
    "created review ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdReview.id,
    ),
  );

  TestValidator.predicate(
    "created review created_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      createdReview.created_at,
    ),
  );

  TestValidator.predicate(
    "created review updated_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      createdReview.updated_at,
    ),
  );

  // Step 4: Permission error test - try to create review without authentication
  // Use an unauthenticated connection without any headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot create review",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.create(
        unauthConnection,
        {
          body: reviewCreateBody,
        },
      );
    },
  );

  // Step 5: Business rule validation - prevent duplicate reviews by same user on same recipe
  // Attempt to create a duplicate review with identical user ID and recipe ID
  // Expect an error (could be rejection or validation failure)
  await TestValidator.error(
    "duplicate review creation is rejected",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.create(
        connection,
        {
          body: reviewCreateBody,
        },
      );
    },
  );
}
