import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * Validate retrieval of recipe sharing premium user review entity.
 *
 * This test covers:
 *
 * 1. Happy path retrieving a review by authenticated premium user
 * 2. Resource not found error when fetching review by fake ID
 * 3. Permission error when accessing review without authentication
 *
 * The test performs premium user join and login for authentication setup,
 * then tests the get review endpoint with valid and invalid cases,
 * capturing and asserting expected results and errors.
 *
 * It ensures proper response type validation with typia.assert and business
 * logic validation with TestValidator.error.
 *
 * Invalid data type and malformed UUID scenarios are omitted per rules.
 */
export async function test_api_recipe_sharing_premiumuser_reviews_at_success_and_not_found_and_permission_error(
  connection: api.IConnection,
) {
  // 1. Create and authenticate premium user
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const user: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Login as the premium user
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;
  await api.functional.auth.premiumUser.login(connection, { body: loginBody });

  // 3. Happy path: Retrieve a valid recipe sharing review
  const validReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const review: IRecipeSharingReview =
    await api.functional.recipeSharing.premiumUser.reviews.at(connection, {
      id: validReviewId,
    });
  typia.assert(review);

  // 4. Not found error: Try fetching non-existent review
  await TestValidator.error("resource not found returns error", async () => {
    const fakeReviewId: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();
    await api.functional.recipeSharing.premiumUser.reviews.at(connection, {
      id: fakeReviewId,
    });
  });

  // 5. Permission error: Access without authentication
  const anonConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access returns permission error",
    async () => {
      await api.functional.recipeSharing.premiumUser.reviews.at(
        anonConnection,
        { id: validReviewId },
      );
    },
  );
}
