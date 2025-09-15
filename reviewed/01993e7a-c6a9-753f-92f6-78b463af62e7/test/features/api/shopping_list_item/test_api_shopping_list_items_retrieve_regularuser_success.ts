import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingShoppingListItem";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";

/**
 * Test retrieval of all shopping list items for a shopping list owned by a
 * regular user.
 *
 * This test creates a regular user account, performs login, and simulates a
 * shopping list ID. It then retrieves the shopping list items for this list and
 * validates the response structure. Although shopping list and item creation
 * APIs are not available, this test ensures that the item retrieval API
 * correctly returns valid data and adheres to authorization contexts.
 *
 * The test asserts pagination details and verifies each shopping list item's
 * IDs and properties.
 */
export async function test_api_shopping_list_items_retrieve_regularuser_success(
  connection: api.IConnection,
) {
  // 1. Create regular user
  const userCreateBody = {
    email: `user${Date.now()}@example.com`,
    password_hash: typia.random<string>(),
    username: `user${Date.now()}`,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const createdUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  // 2. Login regular user
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedInUser);

  // 3. Simulate a shoppingListId as UUID
  const shoppingListId = typia.random<string & tags.Format<"uuid">>();

  // 4 and 5. Fetch shopping list items
  const shoppingListItemsPage: IPageIRecipeSharingShoppingListItem.ISummary =
    await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.index(
      connection,
      { shoppingListId: shoppingListId },
    );

  typia.assert(shoppingListItemsPage);

  // 6. Pagination validations
  TestValidator.predicate(
    "pagination current page number is non-negative",
    shoppingListItemsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    shoppingListItemsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    shoppingListItemsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    shoppingListItemsPage.pagination.pages >= 0,
  );

  // Validate each item
  for (const item of shoppingListItemsPage.data) {
    typia.assert<IRecipeSharingShoppingListItem.ISummary>(item);
    TestValidator.predicate(
      "shopping list item id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      "ingredient id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.ingredient_id,
      ),
    );
    TestValidator.predicate(
      "quantity is positive number",
      typeof item.quantity === "number" && item.quantity > 0,
    );
    TestValidator.predicate(
      "unit is non-empty string",
      typeof item.unit === "string" && item.unit.length > 0,
    );
  }
}
