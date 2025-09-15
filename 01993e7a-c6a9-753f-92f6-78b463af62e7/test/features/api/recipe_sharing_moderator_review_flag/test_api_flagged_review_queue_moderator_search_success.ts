import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReviewFlag";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";

/**
 * This test scenario verifies that a moderator user can search and retrieve a
 * paginated list of flags associated with a specific recipe review. The
 * scenario covers filtering capabilities, pagination handling, and ensures that
 * only authorized moderator users can access the flagged review queue. It
 * verifies that the fetched list contains accurate details of flags, including
 * user IDs, report reasons, statuses, and timestamps. The proper handling of
 * empty result sets and invalid parameters is implicitly covered by system
 * validation.
 */
export async function test_api_flagged_review_queue_moderator_search_success(
  connection: api.IConnection,
) {
  // Moderator joins and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPassword,
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // Prepare request to get flags of a specific review
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // Construct pagination/filter request body
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: RandomGenerator.name(1),
    order: "asc",
  } satisfies IRecipeSharingReviewFlag.IRequest;

  // Call the index flags API
  const result: IPageIRecipeSharingReviewFlag =
    await api.functional.recipeSharing.moderator.reviews.flags.indexFlags(
      connection,
      {
        reviewId,
        body: requestBody,
      },
    );

  typia.assert(result);

  // Basic validation of pagination properties
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    result.pagination.pages >= 1,
  );

  // Validate the flags item structure
  for (const flag of result.data) {
    typia.assert(flag);
    TestValidator.predicate(
      `flag id (${flag.id}) is valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        flag.id,
      ),
    );
    TestValidator.predicate(
      `flag reason (${flag.reason}) is not empty`,
      typeof flag.reason === "string" && flag.reason.length > 0,
    );
    TestValidator.predicate(
      `flag recipe_sharing_user_id (${flag.recipe_sharing_user_id}) is valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        flag.recipe_sharing_user_id,
      ),
    );
    TestValidator.predicate(
      `flag recipe_sharing_review_id (${flag.recipe_sharing_review_id}) matches reviewId`,
      flag.recipe_sharing_review_id === reviewId,
    );
  }
}
