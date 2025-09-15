import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingUserTags";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";

/**
 * Test verifying authenticated access and filtering capabilities of the
 * user tags search endpoint.
 *
 * This function performs:
 *
 * - Regular user registration and authentication.
 * - Validates ability to search tags with no filter returns all results
 *   paginated.
 * - Validates filtering by status = 'pending', 'approved', 'rejected'.
 * - Validates filtering by partial match for suggested_name.
 * - Validates pagination by page and limit.
 * - Validates unauthorized access error when no authentication.
 */
export async function test_api_user_tag_search_pagination_filtering_authenticated(
  connection: api.IConnection,
) {
  // Step 1: Regular user creation and authentication
  const regularUserCreate = {
    email: `${RandomGenerator.name()}${Date.now()}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreate,
    });
  typia.assert(authorizedUser);

  // Helper to perform searchUserTags calls with given request body
  async function searchUserTags(
    requestBody: IRecipeSharingUserTags.IRequest,
  ): Promise<IPageIRecipeSharingUserTags.ISummary> {
    const response =
      await api.functional.recipeSharing.regularUser.userTags.searchUserTags(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(response);
    return response;
  }

  // Step 2: Search with no filters (should paginate all data)
  const allTagsResponse = await searchUserTags({});
  typia.assert(allTagsResponse.pagination);
  typia.assert(allTagsResponse.data);

  TestValidator.predicate(
    "pagination current page is positive integer",
    allTagsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    allTagsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive integer",
    allTagsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allTagsResponse.pagination.records >= 0,
  );

  for (const tag of allTagsResponse.data) {
    TestValidator.predicate(
      "status is one of pending, approved, rejected",
      tag.status === "pending" ||
        tag.status === "approved" ||
        tag.status === "rejected",
    );

    TestValidator.predicate(
      "suggested_name is string",
      typeof tag.suggested_name === "string" && tag.suggested_name.length > 0,
    );

    TestValidator.predicate(
      "id is non-empty string",
      typeof tag.id === "string" && tag.id.length > 0,
    );
  }

  // Step 3: Search by each status filter
  const statusValues: Array<"pending" | "approved" | "rejected"> = [
    "pending",
    "approved",
    "rejected",
  ];
  for (const status of statusValues) {
    const filteredResponse = await searchUserTags({ status });
    typia.assert(filteredResponse);
    for (const tag of filteredResponse.data) {
      TestValidator.equals(
        `tag status should be ${status}`,
        tag.status,
        status,
      );
    }
  }

  // Step 4: Search filtered by partial suggested_name
  if (allTagsResponse.data.length > 0) {
    const sampleTag = allTagsResponse.data[0];
    const partial = sampleTag.suggested_name.substring(0, 3);
    const partialFilterResponse = await searchUserTags({
      suggested_name: partial,
    });
    typia.assert(partialFilterResponse);
    for (const tag of partialFilterResponse.data) {
      TestValidator.predicate(
        `suggested_name ${tag.suggested_name} includes partial '${partial}'`,
        tag.suggested_name.includes(partial),
      );
    }
  }

  // Step 5: Pagination test: page = 1, limit = 2
  const paginationResponse = await searchUserTags({ page: 1, limit: 2 });
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination data length <= limit",
    paginationResponse.data.length <= 2,
  );

  // Step 6: Unauthorized access test to validate error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should throw", async () => {
    await api.functional.recipeSharing.regularUser.userTags.searchUserTags(
      unauthenticatedConnection,
      { body: {} },
    );
  });
}
