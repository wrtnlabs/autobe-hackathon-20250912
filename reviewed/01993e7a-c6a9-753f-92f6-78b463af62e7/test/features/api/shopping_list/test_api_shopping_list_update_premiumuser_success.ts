import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";

export async function test_api_shopping_list_update_premiumuser_success(
  connection: api.IConnection,
) {
  // 1. Create a new premium user using join API
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: createBody,
    });
  typia.assert(premiumUser);

  // 2. Login as premium user to switch authentication context
  const loginBody = {
    email: premiumUser.email,
    password_hash: createBody.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;
  const loginUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Prepare a new shopping list to simulate creation for this user
  const shoppingListId = typia.random<string & tags.Format<"uuid">>();
  const originalShoppingList: IRecipeSharingShoppingList = {
    id: shoppingListId,
    user_id: premiumUser.id,
    name: RandomGenerator.name(3),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 4. Update the shopping list name
  const updatedName = RandomGenerator.name(4);
  const updateBody: IRecipeSharingShoppingList.IUpdate = {
    name: updatedName,
  };

  // 5. Call update API
  const updatedShoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.premiumUser.shoppingLists.update(
      connection,
      {
        shoppingListId: shoppingListId,
        body: updateBody,
      },
    );
  typia.assert(updatedShoppingList);

  // 6. Assertions: Verify updated shopping list
  TestValidator.equals(
    "shopping list id remains unchanged",
    updatedShoppingList.id,
    originalShoppingList.id,
  );
  TestValidator.equals(
    "shopping list belongs to the premium user",
    updatedShoppingList.user_id,
    premiumUser.id,
  );
  TestValidator.equals(
    "shopping list name has been updated",
    updatedShoppingList.name,
    updatedName,
  );
  TestValidator.predicate(
    "shopping list updated_at is later or equal",
    new Date(updatedShoppingList.updated_at).getTime() >=
      new Date(originalShoppingList.updated_at).getTime(),
  );
}
