import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPersonalizedFeed";
import type { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_personalized_feed_list_regularuser_filtered_pagination(
  connection: api.IConnection,
) {
  // 1. Create a new regular user by calling join endpoint
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Prepare filter criteria with valid UUIDs
  const filterUserId = authorizedUser.id;
  const filterRecipeId = typia.random<string & tags.Format<"uuid">>();
  const filterOriginatorUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare pagination and sorting parameters
  const pageNumber = 0; // zero-based page index
  const limitNumber = 10;
  const sortField = "created_at";
  const sortOrder: "asc" | "desc" = "desc";

  // 4. Query personalized feeds with filters
  const requestBody: IRecipeSharingPersonalizedFeed.IRequest = {
    user_id: filterUserId,
    recipe_id: filterRecipeId,
    originator_user_id: filterOriginatorUserId,
    page: pageNumber,
    limit: limitNumber,
    sort_by: sortField,
    order: sortOrder,
  };

  const pagedFeeds: IPageIRecipeSharingPersonalizedFeed.ISummary =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.index(
      connection,
      {
        body: requestBody,
      },
    );

  typia.assert(pagedFeeds);

  TestValidator.predicate(
    "pagination page should be equal to requested",
    pagedFeeds.pagination.current === pageNumber,
  );

  TestValidator.predicate(
    "pagination limit should be equal to requested",
    pagedFeeds.pagination.limit === limitNumber,
  );

  TestValidator.predicate(
    "data array size should be <= limit",
    pagedFeeds.data.length <= limitNumber,
  );

  if (pagedFeeds.data.length > 1) {
    // Validate sorting order by created_at descending
    for (let i = 1; i < pagedFeeds.data.length; i++) {
      TestValidator.predicate(
        `feed created_at order: item ${i - 1} >= item ${i}`,
        pagedFeeds.data[i - 1].created_at >= pagedFeeds.data[i].created_at,
      );
    }
  }

  // 5. Test unauthorized access: Try query with an unauthenticated connection
  const unauthedConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access to personalized feeds should throw",
    async () => {
      await api.functional.recipeSharing.regularUser.personalizedFeeds.index(
        unauthedConnection,
        {
          body: {
            user_id: filterUserId,
            recipe_id: null,
            originator_user_id: null,
            page: 0,
            limit: 1,
            sort_by: null,
            order: null,
          },
        },
      );
    },
  );
}
