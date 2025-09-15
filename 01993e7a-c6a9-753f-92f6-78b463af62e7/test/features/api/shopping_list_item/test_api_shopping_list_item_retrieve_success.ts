import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import type { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";

/**
 * This test verifies the entire flow of creating and retrieving a shopping
 * list item by a regular user in the recipe sharing system. It ensures that
 * only authenticated, authorized users who own the shopping list can
 * retrieve item details successfully.
 *
 * Test steps:
 *
 * 1. Register a new regular user via join endpoint.
 * 2. Login as that user via login endpoint.
 * 3. Create a new shopping list for the user.
 * 4. Create a shopping list item within that shopping list specifying
 *    ingredient, quantity, unit, and optional notes.
 * 5. Retrieve the created shopping list item by its ID.
 * 6. Assert all returned data have the correct types and values matching
 *    initial inputs.
 *
 * This test validates authentication, resource ownership, data integrity,
 * and API contract adherence.
 */
export async function test_api_shopping_list_item_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user = await api.functional.auth.regularUser.join(connection, {
    body: userCreateBody,
  });
  typia.assert(user);

  // 2. Login as the created user
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loggedInUser = await api.functional.auth.regularUser.login(connection, {
    body: userLoginBody,
  });
  typia.assert(loggedInUser);

  // 3. Create a new shopping list owned by the user
  const shoppingListCreateBody = {
    user_id: loggedInUser.id,
    name: RandomGenerator.name(3),
  } satisfies IRecipeSharingShoppingList.ICreate;
  const shoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: shoppingListCreateBody,
      },
    );
  typia.assert(shoppingList);
  TestValidator.equals(
    "shopping list user_id matches logged-in user id",
    shoppingList.user_id,
    loggedInUser.id,
  );

  // 4. Create a new shopping list item within the created shopping list
  const shoppingListItemCreateBody = {
    shopping_list_id: shoppingList.id,
    ingredient_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 5,
    unit: "pcs",
    notes: null,
  } satisfies IRecipeSharingShoppingListItem.ICreate;
  const shoppingListItem =
    await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.create(
      connection,
      {
        shoppingListId: shoppingList.id,
        body: shoppingListItemCreateBody,
      },
    );
  typia.assert(shoppingListItem);
  TestValidator.equals(
    "shopping list item shopping_list_id matches shopping list id",
    shoppingListItem.shopping_list_id,
    shoppingList.id,
  );

  // 5. Retrieve the created shopping list item by ID
  const retrievedItem =
    await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.at(
      connection,
      {
        shoppingListId: shoppingList.id,
        shoppingListItemId: shoppingListItem.id,
      },
    );
  typia.assert(retrievedItem);

  // 6. Validate that the retrieved item matches the created item
  TestValidator.equals(
    "retrieved shopping list item id equals created",
    retrievedItem.id,
    shoppingListItem.id,
  );
  TestValidator.equals(
    "retrieved shopping list item ingredient_id equals created",
    retrievedItem.ingredient_id,
    shoppingListItem.ingredient_id,
  );
  TestValidator.equals(
    "retrieved shopping list item quantity equals created",
    retrievedItem.quantity,
    shoppingListItem.quantity,
  );
  TestValidator.equals(
    "retrieved shopping list item unit equals created",
    retrievedItem.unit,
    shoppingListItem.unit,
  );
  TestValidator.equals(
    "retrieved shopping list item notes equals created",
    retrievedItem.notes,
    shoppingListItem.notes,
  );
}
