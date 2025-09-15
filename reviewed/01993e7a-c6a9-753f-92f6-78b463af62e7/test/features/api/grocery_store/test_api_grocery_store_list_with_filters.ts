import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingGroceryStore";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";

export async function test_api_grocery_store_list_with_filters(
  connection: api.IConnection,
) {
  // 1. Request default grocery store list (no filters)
  const defaultRequestBody = {} satisfies IRecipeSharingGroceryStore.IRequest;
  const defaultResponse =
    await api.functional.recipeSharing.groceryStores.index(connection, {
      body: defaultRequestBody,
    });
  typia.assert(defaultResponse);

  // Validate pagination info presence and values
  TestValidator.predicate(
    "default response pagination exists",
    defaultResponse.pagination !== null &&
      defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "default response pagination records > 0",
    defaultResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "default response pagination pages > 0",
    defaultResponse.pagination.pages > 0,
  );

  // Validate each grocery store summary in data
  for (const store of defaultResponse.data) {
    typia.assert(store);
    TestValidator.predicate(
      "store id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        store.id,
      ),
    );
    TestValidator.predicate("store name is nonempty", store.name.length > 0);
  }

  // 2. Request grocery stores with a search parameter
  // Pick a random store name substring from existing data to search
  const sampleStoreName =
    defaultResponse.data.length > 0 ? defaultResponse.data[0].name : "test";
  const searchString =
    sampleStoreName.length > 3
      ? sampleStoreName.slice(0, 3) // substring for search
      : sampleStoreName;
  const searchRequestBody = {
    search: searchString,
  } satisfies IRecipeSharingGroceryStore.IRequest;

  const searchResponse = await api.functional.recipeSharing.groceryStores.index(
    connection,
    { body: searchRequestBody },
  );
  typia.assert(searchResponse);

  // Validate all returned stores contain search string in name
  for (const store of searchResponse.data) {
    typia.assert(store);
    TestValidator.predicate(
      "search result name contains search string",
      store.name.toLowerCase().includes(searchString.toLowerCase()),
    );
  }

  // 3. Test pagination with page and limit
  const pageTestRequestBody = {
    page: 2,
    limit: 1,
  } satisfies IRecipeSharingGroceryStore.IRequest;

  const pageTestResponse =
    await api.functional.recipeSharing.groceryStores.index(connection, {
      body: pageTestRequestBody,
    });
  typia.assert(pageTestResponse);

  // Validate pagination info values
  TestValidator.equals(
    "pagination current page equals 2",
    pageTestResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit equals 1",
    pageTestResponse.pagination.limit,
    1,
  );

  // 4. Test sorting ascending by name
  const sortAscRequestBody = {
    sort: "name|asc",
  } satisfies IRecipeSharingGroceryStore.IRequest;

  const sortAscResponse =
    await api.functional.recipeSharing.groceryStores.index(connection, {
      body: sortAscRequestBody,
    });
  typia.assert(sortAscResponse);

  // Validate data is sorted ascending by name
  for (let i = 1; i < sortAscResponse.data.length; i++) {
    const prev = sortAscResponse.data[i - 1].name.toLowerCase();
    const curr = sortAscResponse.data[i].name.toLowerCase();
    TestValidator.predicate("ascending sorted names", prev <= curr);
  }

  // 5. Test sorting descending by name
  const sortDescRequestBody = {
    sort: "name|desc",
  } satisfies IRecipeSharingGroceryStore.IRequest;

  const sortDescResponse =
    await api.functional.recipeSharing.groceryStores.index(connection, {
      body: sortDescRequestBody,
    });
  typia.assert(sortDescResponse);

  // Validate data is sorted descending by name
  for (let i = 1; i < sortDescResponse.data.length; i++) {
    const prev = sortDescResponse.data[i - 1].name.toLowerCase();
    const curr = sortDescResponse.data[i].name.toLowerCase();
    TestValidator.predicate("descending sorted names", prev >= curr);
  }
}
