import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import type { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";

/**
 * Test the addition of shopping list items for a regular user's shopping
 * list.
 *
 * This test verifies the happy path where a user successfully adds an item
 * to their shopping list, as well as failure scenarios involving
 * unauthorized access or invalid inputs.
 *
 * Steps:
 *
 * 1. Register and authenticate a regular user.
 * 2. Create an ingredient.
 * 3. Create a shopping list for the user.
 * 4. Add a valid shopping list item with correct shopping list and ingredient
 *    IDs.
 * 5. Test failure for unauthenticated shopping list item addition.
 * 6. Test failure when providing invalid shopping list ID.
 * 7. Test failure when providing invalid ingredient ID.
 */
export async function test_api_shopping_list_item_add_success_and_failures(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a regular user
  const user = await api.functional.auth.regularUser.join(connection, {
    body: {
      email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
      password_hash: RandomGenerator.alphaNumeric(32),
      username: RandomGenerator.name(2),
    } satisfies IRecipeSharingRegularUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create an ingredient
  const ingredientCreateBody = {
    name: RandomGenerator.name(),
  } satisfies IRecipeSharingIngredient.ICreate;
  const ingredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreateBody,
      },
    );
  typia.assert(ingredient);

  // Step 3: Create a shopping list for the user
  const shoppingListCreateBody = {
    user_id: user.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRecipeSharingShoppingList.ICreate;
  const shoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: shoppingListCreateBody,
      },
    );
  typia.assert(shoppingList);

  // Step 4: Add a valid shopping list item
  const shoppingListItemCreateBody = {
    shopping_list_id: shoppingList.id,
    ingredient_id: ingredient.id,
    quantity: Math.floor(Math.random() * 10) + 1,
    unit: RandomGenerator.pick(["grams", "cups", "pieces"] as const),
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
    "shopping list ID matches",
    shoppingListItem.shopping_list_id,
    shoppingList.id,
  );
  TestValidator.equals(
    "ingredient ID matches",
    shoppingListItem.ingredient_id,
    ingredient.id,
  );

  // Step 5: Attempt to add a shopping list item without authentication - expect failure
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated add shopping list item should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.create(
        unauthenticatedConn,
        {
          shoppingListId: shoppingList.id,
          body: shoppingListItemCreateBody,
        },
      );
    },
  );

  // Step 6: Attempt to add a shopping list item with invalid shoppingListId - expect error
  await TestValidator.error(
    "add shopping list item with invalid shoppingListId should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.create(
        connection,
        {
          shoppingListId: "00000000-0000-0000-0000-000000000000",
          body: shoppingListItemCreateBody,
        },
      );
    },
  );

  // Step 7: Attempt to add a shopping list item with invalid ingredientId - expect error
  const invalidIngredientBody = {
    ...shoppingListItemCreateBody,
    ingredient_id: "00000000-0000-0000-0000-000000000000",
  } satisfies IRecipeSharingShoppingListItem.ICreate;
  await TestValidator.error(
    "add shopping list item with invalid ingredientId should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.shoppingLists.shoppingListItems.create(
        connection,
        {
          shoppingListId: shoppingList.id,
          body: invalidIngredientBody,
        },
      );
    },
  );
}
