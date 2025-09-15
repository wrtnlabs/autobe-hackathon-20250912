import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingDietCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingDietCategories";
import type { IRecipeSharingDietCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategories";

export async function test_api_diet_category_search_pagination_public_access(
  connection: api.IConnection,
) {
  // 1. Default pagination without filters
  const defaultOutput: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      { body: {} satisfies IRecipeSharingDietCategories.IRequest },
    );
  typia.assert(defaultOutput);
  TestValidator.predicate(
    "default pagination page >= 1",
    defaultOutput.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination limit >= 1",
    defaultOutput.pagination.limit >= 1,
  );

  // 2. Filtering by code substring
  const codeFilter = "veg";
  const codeFilteredOutput: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: {
          code: codeFilter,
        } satisfies IRecipeSharingDietCategories.IRequest,
      },
    );
  typia.assert(codeFilteredOutput);
  for (const category of codeFilteredOutput.data) {
    TestValidator.predicate(
      `code includes filter '${codeFilter}'`,
      category.code.includes(codeFilter),
    );
  }

  // 3. Filtering by name substring
  const nameFilter = "health";
  const nameFilteredOutput: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: {
          name: nameFilter,
        } satisfies IRecipeSharingDietCategories.IRequest,
      },
    );
  typia.assert(nameFilteredOutput);
  for (const category of nameFilteredOutput.data) {
    TestValidator.predicate(
      `name includes filter '${nameFilter}'`,
      category.name.toLowerCase().includes(nameFilter),
    );
  }

  // 4. Sorting by code ascending
  const sortCodeAsc: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: {
          orderBy: "code",
          orderDirection: "asc",
        } satisfies IRecipeSharingDietCategories.IRequest,
      },
    );
  typia.assert(sortCodeAsc);
  for (let i = 1; i < sortCodeAsc.data.length; i++) {
    TestValidator.predicate(
      "codes are in ascending order",
      sortCodeAsc.data[i - 1].code <= sortCodeAsc.data[i].code,
    );
  }

  // 5. Sorting by code descending
  const sortCodeDesc: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: {
          orderBy: "code",
          orderDirection: "desc",
        } satisfies IRecipeSharingDietCategories.IRequest,
      },
    );
  typia.assert(sortCodeDesc);
  for (let i = 1; i < sortCodeDesc.data.length; i++) {
    TestValidator.predicate(
      "codes are in descending order",
      sortCodeDesc.data[i - 1].code >= sortCodeDesc.data[i].code,
    );
  }

  // 6. Sorting by name ascending
  const sortNameAsc: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: {
          orderBy: "name",
          orderDirection: "asc",
        } satisfies IRecipeSharingDietCategories.IRequest,
      },
    );
  typia.assert(sortNameAsc);
  for (let i = 1; i < sortNameAsc.data.length; i++) {
    TestValidator.predicate(
      "names are in ascending order",
      sortNameAsc.data[i - 1].name <= sortNameAsc.data[i].name,
    );
  }

  // 7. Sorting by name descending
  const sortNameDesc: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: {
          orderBy: "name",
          orderDirection: "desc",
        } satisfies IRecipeSharingDietCategories.IRequest,
      },
    );
  typia.assert(sortNameDesc);
  for (let i = 1; i < sortNameDesc.data.length; i++) {
    TestValidator.predicate(
      "names are in descending order",
      sortNameDesc.data[i - 1].name >= sortNameDesc.data[i].name,
    );
  }

  // 8. Pagination page=2 and limit=5
  const page2limit5: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: {
          page: 2 satisfies number,
          limit: 5 satisfies number,
        } satisfies IRecipeSharingDietCategories.IRequest,
      },
    );
  typia.assert(page2limit5);
  TestValidator.equals(
    "pagination page equals 2",
    page2limit5.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit equals 5",
    page2limit5.pagination.limit,
    5,
  );

  // 9. Empty result for impossible code and name
  const emptyFilter: IPageIRecipeSharingDietCategories.ISummary =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: {
          code: "nonexistentcode",
          name: "nonexistentname",
        } satisfies IRecipeSharingDietCategories.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "empty result data length equals 0",
    emptyFilter.data.length,
    0,
  );
}
