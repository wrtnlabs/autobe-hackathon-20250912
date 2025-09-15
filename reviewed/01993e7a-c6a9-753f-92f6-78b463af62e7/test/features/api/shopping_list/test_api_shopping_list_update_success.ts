import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";

export async function test_api_shopping_list_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Create a shopping list for the user
  const shoppingListCreateBody = {
    user_id: user.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
  } satisfies IRecipeSharingShoppingList.ICreate;

  const shoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: shoppingListCreateBody,
      },
    );
  typia.assert(shoppingList);

  // 3. Prepare update data for the shopping list (we update 'name' only)
  const newShoppingListName = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 10,
  });
  const shoppingListUpdateBody = {
    name: newShoppingListName,
    deleted_at: null, // explicit null as the list is not deleted
  } satisfies IRecipeSharingShoppingList.IUpdate;

  // 4. Call update API with shoppingListId path parameter and update body
  const updatedShoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.update(
      connection,
      {
        shoppingListId: shoppingList.id,
        body: shoppingListUpdateBody,
      },
    );
  typia.assert(updatedShoppingList);

  // 5. Validate updated properties
  TestValidator.equals(
    "updated shopping list id matches original",
    updatedShoppingList.id,
    shoppingList.id,
  );
  TestValidator.equals(
    "updated shopping list user_id matches original",
    updatedShoppingList.user_id,
    shoppingList.user_id,
  );
  TestValidator.equals(
    "updated shopping list name matches new name",
    updatedShoppingList.name,
    newShoppingListName,
  );
  TestValidator.equals(
    "updated shopping list deleted_at is null",
    updatedShoppingList.deleted_at,
    null,
  );
}
