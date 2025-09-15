import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingTags";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";

export async function test_api_tags_index_regular_user_search(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Query tag list with empty search (should return paginated results)
  const noFilterRequestBody = {} satisfies IRecipeSharingTags.IRequest;
  const noFilterPage: IPageIRecipeSharingTags.ISummary =
    await api.functional.recipeSharing.regularUser.tags.index(connection, {
      body: noFilterRequestBody,
    });
  typia.assert(noFilterPage);
  TestValidator.predicate(
    "pagination contains positive total pages",
    noFilterPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "data array is non-empty",
    Array.isArray(noFilterPage.data) && noFilterPage.data.length > 0,
  );

  // 3. Query tag list filtering by specific name substring
  if (noFilterPage.data.length > 0) {
    const sampleTagName = noFilterPage.data[0].name.slice(0, 3);
    const filteredRequestBody = {
      name: sampleTagName,
      limit: 10,
      page: 1,
    } satisfies IRecipeSharingTags.IRequest;

    const filteredPage: IPageIRecipeSharingTags.ISummary =
      await api.functional.recipeSharing.regularUser.tags.index(connection, {
        body: filteredRequestBody,
      });
    typia.assert(filteredPage);

    TestValidator.predicate(
      "filtered data items contain the filter substring",
      filteredPage.data.every(
        (item) =>
          typeof item.name === "string" && item.name.includes(sampleTagName),
      ),
    );
  }

  // 4. Attempt unauthorized access (no auth headers)
  const noAuthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access to tags endpoint should throw error",
    async () => {
      await api.functional.recipeSharing.regularUser.tags.index(
        noAuthConnection,
        {
          body: {} satisfies IRecipeSharingTags.IRequest,
        },
      );
    },
  );
}
