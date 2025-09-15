import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingDifficultyLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingDifficultyLevel";
import type { IRecipeSharingDifficultyLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevel";

/**
 * This E2E test validates pagination, search filtering, and sorting
 * behaviors of the PATCH /recipeSharing/difficultyLevels endpoint. It tests
 * default and custom paging parameters, verifies that results are filtered
 * by search terms, and checks sorting by name, created_at, and code in
 * ascending and descending order. It asserts response types, pagination
 * metadata, and sorting order of returned difficulty level summaries. The
 * endpoint is public, so no authentication is needed.
 */
export async function test_api_difficulty_level_search_pagination(
  connection: api.IConnection,
) {
  // 1. Test default pagination (page 0, limit default)
  const defaultRequest = {} satisfies IRecipeSharingDifficultyLevel.IRequest;
  const defaultResponse: IPageIRecipeSharingDifficultyLevel =
    await api.functional.recipeSharing.difficultyLevels.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default pagination - current page non-negative",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default pagination - limit positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination - records non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination - pages non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default pagination - data length <= limit",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );

  // 2. Test custom pagination parameters (page 1, limit 5)
  const customRequest = {
    page: 1,
    limit: 5,
  } satisfies IRecipeSharingDifficultyLevel.IRequest;
  const customResponse: IPageIRecipeSharingDifficultyLevel =
    await api.functional.recipeSharing.difficultyLevels.index(connection, {
      body: customRequest,
    });
  typia.assert(customResponse);
  TestValidator.equals(
    "custom pagination - requested page",
    customResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination - requested limit",
    customResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "custom pagination - records non-negative",
    customResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "custom pagination - pages non-negative",
    customResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "custom pagination - data length <= limit",
    customResponse.data.length <= 5,
  );

  // 3. Test filtering by search term
  const searchTerm =
    customResponse.data.length > 0 && customResponse.data[0].name.length >= 2
      ? customResponse.data[0].name.substring(0, 2)
      : "easy";
  const searchRequest = {
    search: searchTerm,
  } satisfies IRecipeSharingDifficultyLevel.IRequest;
  const searchResponse: IPageIRecipeSharingDifficultyLevel =
    await api.functional.recipeSharing.difficultyLevels.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search filtering - all names contain search term",
    searchResponse.data.every((x) => x.name.includes(searchTerm)),
  );

  // 4. Test sorting by fields in ascending and descending order
  const sortableFields = ["name", "created_at", "code"] as const;
  for (const field of sortableFields) {
    // Ascending order
    const ascRequest = {
      sort: field,
      sortOrder: "asc",
    } satisfies IRecipeSharingDifficultyLevel.IRequest;
    const ascResponse: IPageIRecipeSharingDifficultyLevel =
      await api.functional.recipeSharing.difficultyLevels.index(connection, {
        body: ascRequest,
      });
    typia.assert(ascResponse);
    TestValidator.predicate(
      `sorting asc - data length <= limit for field ${field}`,
      ascResponse.data.length <= ascResponse.pagination.limit,
    );
    for (let i = 1; i < ascResponse.data.length; ++i) {
      const prev = ascResponse.data[i - 1][field];
      const curr = ascResponse.data[i][field];
      TestValidator.predicate(
        `sorting asc - items sorted by ${field}`,
        prev <= curr ||
          (typeof prev === "string" &&
            typeof curr === "string" &&
            prev.localeCompare(curr) <= 0),
      );
    }

    // Descending order
    const descRequest = {
      sort: field,
      sortOrder: "desc",
    } satisfies IRecipeSharingDifficultyLevel.IRequest;
    const descResponse: IPageIRecipeSharingDifficultyLevel =
      await api.functional.recipeSharing.difficultyLevels.index(connection, {
        body: descRequest,
      });
    typia.assert(descResponse);
    TestValidator.predicate(
      `sorting desc - data length <= limit for field ${field}`,
      descResponse.data.length <= descResponse.pagination.limit,
    );
    for (let i = 1; i < descResponse.data.length; ++i) {
      const prev = descResponse.data[i - 1][field];
      const curr = descResponse.data[i][field];
      TestValidator.predicate(
        `sorting desc - items sorted by ${field}`,
        prev >= curr ||
          (typeof prev === "string" &&
            typeof curr === "string" &&
            prev.localeCompare(curr) >= 0),
      );
    }
  }
}
