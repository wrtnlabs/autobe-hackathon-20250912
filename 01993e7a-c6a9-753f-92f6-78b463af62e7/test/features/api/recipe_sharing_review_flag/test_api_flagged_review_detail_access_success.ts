import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";

export async function test_api_flagged_review_detail_access_success(
  connection: api.IConnection,
) {
  // 1. Create a new moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(20);
  const moderatorUsername = RandomGenerator.name(1);

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Use valid UUIDs to request flag details
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const flagId = typia.random<string & tags.Format<"uuid">>();

  const flagDetail: IRecipeSharingReviewFlag =
    await api.functional.recipeSharing.moderator.reviews.flags.atFlag(
      connection,
      {
        reviewId,
        flagId,
      },
    );
  typia.assert(flagDetail);

  // 3. Verify returned flag detail matches requested identifiers
  TestValidator.equals("flag id matches", flagDetail.id, flagId);
  TestValidator.equals(
    "flag review id matches",
    flagDetail.recipe_sharing_review_id,
    reviewId,
  );
  TestValidator.predicate(
    "flag reason is non-empty string",
    typeof flagDetail.reason === "string" && flagDetail.reason.length > 0,
  );
  TestValidator.predicate(
    "flag recipe_sharing_user_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      flagDetail.recipe_sharing_user_id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      flagDetail.created_at,
    ),
  );
}
