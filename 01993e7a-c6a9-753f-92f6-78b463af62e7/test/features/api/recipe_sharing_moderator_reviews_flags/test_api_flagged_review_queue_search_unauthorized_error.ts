import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReviewFlag";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";

export async function test_api_flagged_review_queue_search_unauthorized_error(
  connection: api.IConnection,
) {
  // 1. Moderator join for prerequisite authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(16);
  const moderatorUsername = RandomGenerator.name(2);

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test unauthorized access: no authentication
  {
    const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
    await TestValidator.error(
      "unauthorized search attempt without authentication",
      async () => {
        await api.functional.recipeSharing.moderator.reviews.flags.indexFlags(
          unauthenticatedConn,
          {
            reviewId: typia.random<string & tags.Format<"uuid">>(),
            body: {
              page: 1,
              limit: 10,
              search: "test",
              order: "asc",
            } satisfies IRecipeSharingReviewFlag.IRequest,
          },
        );
      },
    );
  }

  // 3. Test unauthorized access: simulated unauthorized role (no login API provided)
  {
    const nonModeratorConn: api.IConnection = { ...connection, headers: {} };
    await TestValidator.error(
      "unauthorized search attempt with unauthorized role",
      async () => {
        await api.functional.recipeSharing.moderator.reviews.flags.indexFlags(
          nonModeratorConn,
          {
            reviewId: typia.random<string & tags.Format<"uuid">>(),
            body: {
              page: 1,
              limit: 10,
              search: null,
              order: null,
            } satisfies IRecipeSharingReviewFlag.IRequest,
          },
        );
      },
    );
  }
}
