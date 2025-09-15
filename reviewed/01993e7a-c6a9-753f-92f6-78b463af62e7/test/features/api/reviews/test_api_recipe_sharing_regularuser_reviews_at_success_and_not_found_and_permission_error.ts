import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * End-to-end test for retrieving recipe sharing reviews by ID with success, not
 * found and permission error scenarios.
 *
 * This test workflow covers:
 *
 * 1. Regular user registration and login
 * 2. Simulated creation of a review owned by the first user
 * 3. Successful retrieval of the review by its owner
 * 4. Attempted retrieval of a non-existent review (expecting 404 error)
 * 5. Attempted retrieval of review unauthenticated (expecting permission error)
 * 6. A second different regular user registration and login
 * 7. Attempted retrieval of first user's review by second user (expecting
 *    permission error)
 *
 * Note: Since the API does not provide a review creation endpoint, the review
 * data is simulated using typia.random with overriding
 * `recipe_sharing_user_id`.
 */
export async function test_api_recipe_sharing_regularuser_reviews_at_success_and_not_found_and_permission_error(
  connection: api.IConnection,
) {
  // 1. Register the first regular user
  const userCreateBody1 = {
    email: `user${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user1 = await api.functional.auth.regularUser.join(
    { ...connection, headers: {} },
    {
      body: userCreateBody1,
    },
  );
  typia.assert(user1);

  // 2. Clone connection for first user login to maintain independent auth context
  const user1Connection: api.IConnection = { ...connection, headers: {} };

  // 3. Log in as the first user
  const loginBody1 = {
    email: userCreateBody1.email,
    password_hash: userCreateBody1.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const login1 = await api.functional.auth.regularUser.login(user1Connection, {
    body: loginBody1,
  });
  typia.assert(login1);

  // 4. Generate review data simulating a review owned by user1
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const review: IRecipeSharingReview = {
    id: reviewId,
    recipe_sharing_user_id: user1.id,
    recipe_sharing_recipe_id: typia.random<string & tags.Format<"uuid">>(),
    review_text: RandomGenerator.paragraph({ sentences: 8 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  typia.assert(review);

  // 5. Authenticated first user retrieves their review successfully
  const fetchedReview =
    await api.functional.recipeSharing.regularUser.reviews.at(user1Connection, {
      id: review.id,
    });
  typia.assert(fetchedReview);
  TestValidator.equals(
    "fetched review ID equals expected",
    fetchedReview.id,
    review.id,
  );
  TestValidator.equals(
    "fetched review belongs to user1",
    fetchedReview.recipe_sharing_user_id,
    user1.id,
  );

  // 6. Attempt to retrieve a review with a non-existent ID (expect 404 error)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetch non-existent review should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.at(
        user1Connection,
        {
          id: nonExistentId,
        },
      );
    },
  );

  // 7. Attempt to fetch review as unauthenticated (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "fetch review unauthenticated should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.at(unauthConn, {
        id: review.id,
      });
    },
  );

  // 8. Register the second regular user
  const userCreateBody2 = {
    email: `user${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user2 = await api.functional.auth.regularUser.join(
    { ...connection, headers: {} },
    {
      body: userCreateBody2,
    },
  );
  typia.assert(user2);

  // Ensure distinct user IDs
  TestValidator.notEquals("user1 and user2 ids differ", user1.id, user2.id);

  // 9. Clone connection for second user login
  const user2Connection: api.IConnection = { ...connection, headers: {} };

  // 10. Log in as the second user
  const loginBody2 = {
    email: userCreateBody2.email,
    password_hash: userCreateBody2.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const login2 = await api.functional.auth.regularUser.login(user2Connection, {
    body: loginBody2,
  });
  typia.assert(login2);

  // 11. Attempt to fetch first user's review with second user's auth context (expect permission error)
  await TestValidator.error(
    "fetch review by different user should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.reviews.at(
        user2Connection,
        {
          id: review.id,
        },
      );
    },
  );
}
