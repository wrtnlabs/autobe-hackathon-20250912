import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import type { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";

/**
 * E2E test validating that a regular user can create a shopping list and
 * add a shopping list item successfully.
 *
 * Steps:
 *
 * 1. Join a new regular user with unique email, username and password hash.
 * 2. Log in as the created user for authentication.
 * 3. Create a shopping list linked to the user.
 * 4. Create a shopping list item linked to the shopping list with specified
 *    ingredient details.
 * 5. Validate all responses for type correctness and data integrity.
 */
export async function test_api_shopping_list_item_create_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user account
  const email: string = `user_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const username: string = RandomGenerator.name(2);
  // password_hash is a hashed representation; simulate as a random alphanumeric string
  const password_hash: string = RandomGenerator.alphaNumeric(32);

  const newUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email,
        username,
        password_hash,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(newUser);

  // 2. Login as the created user
  const loginUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: {
        email,
        password_hash,
      } satisfies IRecipeSharingRegularUser.ILogin,
    });
  typia.assert(loginUser);

  // 3. Create a shopping list owned by the logged-in user
  const shoppingListName = RandomGenerator.name(3);
  const shoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: {
          user_id: newUser.id,
          name: shoppingListName,
        } satisfies IRecipeSharingShoppingList.ICreate,
      },
    );
  typia.assert(shoppingList);
  TestValidator.equals(
    "shopping list belongs to the user",
    shoppingList.user_id,
    newUser.id,
  );
  TestValidator.equals(
    "shopping list name matches",
    shoppingList.name,
    shoppingListName,
  );

  // 4. Create a shopping list item inside the created shopping list
  const ingredient_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const quantityNumber = Math.floor(Math.random() * 10) + 1; // Random number between 1 and 10
  const unit = RandomGenerator.pick(["grams", "cups", "pieces"] as const);
  const notes = `Prefer organic ${RandomGenerator.name(1)}`;

  const itemCreateBody = {
    shopping_list_id: shoppingList.id,
    ingredient_id,
    quantity: quantityNumber,
    unit,
    notes,
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

  TestValidator.equals(
    "shopping list item belongs to correct shopping list",
    shoppingListItem.shopping_list_id,
    shoppingList.id,
  );
  TestValidator.equals(
    "ingredient ID matches",
    shoppingListItem.ingredient_id,
    ingredient_id,
  );
  TestValidator.equals("unit matches", shoppingListItem.unit, unit);
  TestValidator.equals("notes match", shoppingListItem.notes, notes);
  TestValidator.equals(
    "quantity matches",
    shoppingListItem.quantity,
    quantityNumber,
  );
}
