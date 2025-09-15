import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import type { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";

/**
 * Test the successful retrieval of a specific shopping list item by a
 * premium user.
 *
 * This test performs the following steps:
 *
 * 1. Creates a premium user account and logs in to obtain authentication
 *    context.
 * 2. Creates a regular user account and logs in to manage shopping lists.
 * 3. Creates a shopping list as the regular user.
 * 4. Adds an item to the shopping list under the regular user.
 * 5. Switches authentication to the premium user.
 * 6. Retrieves the specific shopping list item using premium user credentials.
 * 7. Validates that the retrieved item matches the created item and conforms
 *    to expected business rules.
 *
 * This validates cross-role authorization, data ownership, and proper API
 * flow.
 */
export async function test_api_premium_user_shopping_list_item_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Create Premium User Account
  const premiumUserCreateBody = {
    email: `premium_${RandomGenerator.alphaNumeric(8)}@example.com`,
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreateBody,
    });
  typia.assert(premiumUser);

  // 2. Login as Premium User
  const premiumUserLoginBody = {
    email: premiumUserCreateBody.email,
    password_hash: premiumUserCreateBody.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;

  const premiumUserLoggedIn: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.login(connection, {
      body: premiumUserLoginBody,
    });
  typia.assert(premiumUserLoggedIn);

  // 3. Create Regular User Account
  const regularUserCreateBody = {
    email: `regular_${RandomGenerator.alphaNumeric(8)}@example.com`,
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 4. Login as Regular User
  const regularUserLoginBody = {
    email: regularUserCreateBody.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const regularUserLoggedIn: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLoggedIn);

  // 5. Create Shopping List as Regular User
  const shoppingListCreateBody = {
    user_id: regularUser.id,
    name: `ShoppingList_${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IRecipeSharingShoppingList.ICreate;

  const shoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: shoppingListCreateBody,
      },
    );
  typia.assert(shoppingList);

  // 6. Add Shopping List Item as Regular User
  const shoppingListItemCreateBody = {
    shopping_list_id: shoppingList.id,
    ingredient_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: Math.floor(Math.random() * 10) + 1,
    unit: RandomGenerator.pick(["kg", "g", "pcs", "liters"] as const),
    notes: null,
  } satisfies IRecipeSharingShoppingListItem.ICreate;

  const shoppingListItem: IRecipeSharingShoppingListItem =
    await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.create(
      connection,
      {
        shoppingListId: shoppingList.id,
        body: shoppingListItemCreateBody,
      },
    );
  typia.assert(shoppingListItem);

  // 7. Login again as Premium User to switch context
  await api.functional.auth.premiumUser.login(connection, {
    body: premiumUserLoginBody,
  });

  // 8. Retrieve Shopping List Item as Premium User
  const retrievedItem: IRecipeSharingShoppingListItem =
    await api.functional.recipeSharing.premiumUser.shoppingLists.shoppingListItems.at(
      connection,
      {
        shoppingListId: shoppingList.id,
        shoppingListItemId: shoppingListItem.id,
      },
    );
  typia.assert(retrievedItem);

  // Validate retrieved item properties
  TestValidator.equals(
    "shoppingListId matches",
    retrievedItem.shopping_list_id,
    shoppingList.id,
  );
  TestValidator.equals(
    "shoppingListItemId matches",
    retrievedItem.id,
    shoppingListItem.id,
  );
  TestValidator.equals(
    "ingredientId matches",
    retrievedItem.ingredient_id,
    shoppingListItem.ingredient_id,
  );
  TestValidator.predicate("quantity positive", retrievedItem.quantity > 0);
  TestValidator.predicate(
    "unit is valid",
    ["kg", "g", "pcs", "liters"].includes(retrievedItem.unit),
  );
  if (retrievedItem.notes !== null) {
    TestValidator.predicate(
      "notes is string if present",
      typeof retrievedItem.notes === "string",
    );
  }
}
