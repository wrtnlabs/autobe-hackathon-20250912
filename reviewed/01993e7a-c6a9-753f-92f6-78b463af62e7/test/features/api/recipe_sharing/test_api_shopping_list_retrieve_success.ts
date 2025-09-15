import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";

export async function test_api_shopping_list_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Regular user signs up and authenticates
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a shopping list for the authorized user
  const shoppingListCreateBody = {
    user_id: authorizedUser.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  } satisfies IRecipeSharingShoppingList.ICreate;
  const createdShoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: shoppingListCreateBody,
      },
    );
  typia.assert(createdShoppingList);

  // 3. Retrieve the created shopping list by its id
  const retrievedShoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.at(
      connection,
      {
        shoppingListId: createdShoppingList.id,
      },
    );
  typia.assert(retrievedShoppingList);

  // 4. Validate that the retrieved shopping list matches the created one
  TestValidator.equals(
    "shopping list id should match",
    retrievedShoppingList.id,
    createdShoppingList.id,
  );
  TestValidator.equals(
    "shopping list name should match",
    retrievedShoppingList.name,
    createdShoppingList.name,
  );
  TestValidator.equals(
    "shopping list user_id should match",
    retrievedShoppingList.user_id,
    createdShoppingList.user_id,
  );
  TestValidator.equals(
    "shopping list created_at should match",
    retrievedShoppingList.created_at,
    createdShoppingList.created_at,
  );
  TestValidator.equals(
    "shopping list updated_at should match",
    retrievedShoppingList.updated_at,
    createdShoppingList.updated_at,
  );
  TestValidator.equals(
    "shopping list deleted_at should match",
    retrievedShoppingList.deleted_at,
    createdShoppingList.deleted_at,
  );
}
