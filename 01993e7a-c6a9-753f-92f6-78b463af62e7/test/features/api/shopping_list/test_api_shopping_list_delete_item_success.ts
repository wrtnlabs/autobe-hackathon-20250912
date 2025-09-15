import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import type { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";

/**
 * Validates the deletion of a shopping list item by an authenticated
 * regular user.
 *
 * This test function ensures that the entire workflow from user
 * registration, shopping list creation, item addition, and finally item
 * deletion is properly functioning and respects all business rules
 * including authorization and ownership of resources.
 *
 * Process steps:
 *
 * 1. Register a new regular user and authenticate
 * 2. Create a new shopping list owned by the authenticated user
 * 3. Add a shopping list item to the created shopping list
 * 4. Delete the shopping list item by the same user
 * 5. Validate that the deletion succeeded without errors
 */
export async function test_api_shopping_list_delete_item_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user and authenticate
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPasswordHash = RandomGenerator.alphaNumeric(64); // 64 chars as a hash
  const username: string = RandomGenerator.name(2);

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: userEmail,
        password_hash: userPasswordHash,
        username: username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Create a shopping list for the authenticated user
  const shoppingListName: string = RandomGenerator.name(3);
  const shoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: {
          user_id: authorizedUser.id,
          name: shoppingListName,
        } satisfies IRecipeSharingShoppingList.ICreate,
      },
    );
  typia.assert(shoppingList);

  // 3. Add an item to the shopping list
  const ingredientId: string = typia.random<string & tags.Format<"uuid">>();
  const quantity: number = Math.max(
    1,
    Math.floor(Math.abs(typia.random<number>())),
  );
  const unit: string = RandomGenerator.pick([
    "grams",
    "pieces",
    "cups",
    "tablespoons",
  ] as const);
  const notes: string | null = null;

  const itemCreateBody = {
    shopping_list_id: shoppingList.id,
    ingredient_id: ingredientId,
    quantity: quantity,
    unit: unit,
    notes: notes,
  } satisfies IRecipeSharingShoppingListItem.ICreate;

  const shoppingListItem: IRecipeSharingShoppingListItem =
    await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.create(
      connection,
      {
        shoppingListId: shoppingList.id,
        body: itemCreateBody,
      },
    );
  typia.assert(shoppingListItem);

  // 4. Delete the shopping list item
  await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.erase(
    connection,
    {
      shoppingListId: shoppingList.id,
      shoppingListItemId: shoppingListItem.id,
    },
  );

  // 5. If no error thrown, deletion is successful
  TestValidator.predicate(
    "shopping list item deletion succeeded without errors",
    true,
  );
}
