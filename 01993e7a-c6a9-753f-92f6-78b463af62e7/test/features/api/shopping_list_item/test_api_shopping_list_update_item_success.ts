import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import type { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";

/**
 * Validate an authenticated regular user can successfully update a shopping
 * list item.
 *
 * This test performs the following operations:
 *
 * 1. Registers a new regular user via join operation and obtains authorization
 * 2. Creates a shopping list linked to the newly created user
 * 3. Creates a shopping list item within the created shopping list
 * 4. Updates the shopping list item with new quantity, unit, and notes
 *
 * Each API response is validated using typia.assert to ensure type
 * correctness. TestValidator checks confirm consistency of IDs and updated
 * content. This end-to-end test covers typical user story of managing
 * shopping list items and verifies correct system behavior and data
 * integrity.
 *
 * @param connection - The API connection instance
 */
export async function test_api_shopping_list_update_item_success(
  connection: api.IConnection,
) {
  // 1. Regular user joins (sign up) and gets authorized
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a shopping list under this user
  const shoppingListCreateBody = {
    user_id: user.id,
    name: RandomGenerator.name(3),
  } satisfies IRecipeSharingShoppingList.ICreate;

  const shoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: shoppingListCreateBody,
      },
    );
  typia.assert(shoppingList);

  TestValidator.equals(
    "shoppingList user_id equals user id",
    shoppingList.user_id,
    user.id,
  );

  // 3. Create a shopping list item in the shopping list
  const shoppingListItemCreateBody = {
    shopping_list_id: shoppingList.id,
    ingredient_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    unit: RandomGenerator.alphabets(4),
    notes: "Initial notes",
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

  TestValidator.equals(
    "shoppingListItem belongs to shoppingList",
    shoppingListItem.shopping_list_id,
    shoppingList.id,
  );

  // 4. Update the shopping list item with new quantity, unit, notes
  const updateBody = {
    quantity: shoppingListItem.quantity + 5,
    unit: RandomGenerator.alphabets(5),
    notes: "Updated notes with some details",
  } satisfies IRecipeSharingShoppingListItem.IUpdate;

  const updatedItem: IRecipeSharingShoppingListItem =
    await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.update(
      connection,
      {
        shoppingListId: shoppingList.id,
        shoppingListItemId: shoppingListItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedItem);

  TestValidator.equals(
    "updated item id equals original item id",
    updatedItem.id,
    shoppingListItem.id,
  );
  TestValidator.equals(
    "updated item shopping_list_id",
    updatedItem.shopping_list_id,
    shoppingList.id,
  );
  TestValidator.equals(
    "updated item quantity",
    updatedItem.quantity,
    updateBody.quantity,
  );
  TestValidator.equals("updated item unit", updatedItem.unit, updateBody.unit);
  TestValidator.equals(
    "updated item notes",
    updatedItem.notes ?? null,
    updateBody.notes ?? null,
  );
}
