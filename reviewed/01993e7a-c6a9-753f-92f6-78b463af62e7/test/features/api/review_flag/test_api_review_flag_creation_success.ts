import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";

/**
 * This test verifies the successful creation of a flag on a recipe review
 * by an authenticated regular user.
 *
 * The scenario covers:
 *
 * 1. Registering and authenticating a regular user via the join endpoint.
 * 2. Generating a valid reviewId as a UUID to simulate the target review.
 * 3. Submitting a flag creation request including the user ID, review ID, and
 *    a valid reason.
 * 4. Asserting the response contains a correctly created flag with matching
 *    user and review IDs, a non-empty reason, and a valid creation
 *    timestamp.
 *
 * This test ensures the system correctly handles flag creation requests and
 * association with the appropriate user and review, enforcing validation
 * and type safety through typia.assert and TestValidator assertions.
 */
export async function test_api_review_flag_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a regular user and authenticate
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(24),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Generate a fake reviewId (UUID) to flag
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create flag input body
  const flagCreateBody = {
    recipe_sharing_user_id: authorizedUser.id,
    recipe_sharing_review_id: reviewId,
    reason: `flag_reason_${RandomGenerator.alphabets(8)}`,
  } satisfies IRecipeSharingReviewFlag.ICreate;

  // 4. Call create flag endpoint
  const flagRecord: IRecipeSharingReviewFlag =
    await api.functional.recipeSharing.regularUser.reviews.flags.createFlag(
      connection,
      {
        reviewId,
        body: flagCreateBody,
      },
    );

  typia.assert(flagRecord);

  // 5. Validate response properties
  TestValidator.equals(
    "flag user ID matches",
    flagRecord.recipe_sharing_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "flag review ID matches",
    flagRecord.recipe_sharing_review_id,
    reviewId,
  );
  TestValidator.predicate(
    "flag reason is non-empty",
    flagRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "flag created_at is valid ISO date",
    Boolean(flagRecord.created_at) && !isNaN(Date.parse(flagRecord.created_at)),
  );
}
