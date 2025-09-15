import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";

/**
 * This test function validates that an existing store ingredient price
 * record can be successfully updated by a premium user authenticated
 * through the system.
 *
 * Business context:
 *
 * 1. Create a Premium User and authenticate them.
 * 2. Create a Grocery Store to associate with store ingredient prices.
 * 3. Create an Ingredient entry for pricing.
 * 4. Create an initial Store Ingredient Price record.
 * 5. Update the Store Ingredient Price record's price, availability, and
 *    last_updated fields.
 * 6. Verify that the updated record retains the correct grocery_store_id and
 *    ingredient_id.
 *
 * This ensures the update API behaves correctly in a real-world use case
 * scenario, maintains referential integrity, and respects authorization.
 */
export async function test_api_store_ingredient_price_update_success_premiumuser(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a premium user
  const premiumUserInput = {
    email: `${RandomGenerator.alphabets(5)}@example.com`,
    password_hash: "hashed_password_123",
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserInput,
    });
  typia.assert(premiumUser);

  // 2. Create a grocery store
  const groceryStoreInput = {
    name: RandomGenerator.name(2),
    address: RandomGenerator.paragraph({ sentences: 3 }),
    phone: RandomGenerator.mobile(),
    website_url: `https://www.${RandomGenerator.alphabets(5)}.com`,
  } satisfies IRecipeSharingGroceryStore.ICreate;
  const groceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: groceryStoreInput,
      },
    );
  typia.assert(groceryStore);

  // 3. Create an ingredient
  const ingredientInput = {
    name: RandomGenerator.name(1),
    brand: null,
  } satisfies IRecipeSharingIngredient.ICreate;
  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientInput,
      },
    );
  typia.assert(ingredient);

  // 4. Create a store ingredient price record
  const nowISO = new Date().toISOString();
  const storeIngredientPriceInput = {
    grocery_store_id: groceryStore.id,
    ingredient_id: ingredient.id,
    price: Number((Math.random() * 100).toFixed(2)),
    available: true,
    last_updated: nowISO,
  } satisfies IRecipeSharingStoreIngredientPrice.ICreate;
  const storeIngredientPrice: IRecipeSharingStoreIngredientPrice =
    await api.functional.recipeSharing.premiumUser.storeIngredientPrices.create(
      connection,
      {
        body: storeIngredientPriceInput,
      },
    );
  typia.assert(storeIngredientPrice);

  // 5. Prepare update data
  const updatedPrice = Number((Math.random() * 100 + 100).toFixed(2));
  const updatedAvailable = false;
  const updatedLastUpdated = new Date(
    Date.now() + 1000 * 60 * 60,
  ).toISOString(); // one hour later
  const storeIngredientPriceUpdateInput = {
    price: updatedPrice,
    available: updatedAvailable,
    last_updated: updatedLastUpdated,
  } satisfies IRecipeSharingStoreIngredientPrice.IUpdate;

  // 6. Call update API
  const updatedStoreIngredientPrice: IRecipeSharingStoreIngredientPrice =
    await api.functional.recipeSharing.premiumUser.storeIngredientPrices.update(
      connection,
      {
        storeIngredientPriceId: storeIngredientPrice.id,
        body: storeIngredientPriceUpdateInput,
      },
    );
  typia.assert(updatedStoreIngredientPrice);

  // 7. Validate updated response properties
  TestValidator.equals(
    "storeIngredientPrice.id remains unchanged after update",
    updatedStoreIngredientPrice.id,
    storeIngredientPrice.id,
  );
  TestValidator.equals(
    "storeIngredientPrice.grocery_store_id remains unchanged after update",
    updatedStoreIngredientPrice.grocery_store_id,
    groceryStore.id,
  );
  TestValidator.equals(
    "storeIngredientPrice.ingredient_id remains unchanged after update",
    updatedStoreIngredientPrice.ingredient_id,
    ingredient.id,
  );
  TestValidator.equals(
    "storeIngredientPrice.price is updated",
    updatedStoreIngredientPrice.price,
    updatedPrice,
  );
  TestValidator.equals(
    "storeIngredientPrice.available is updated",
    updatedStoreIngredientPrice.available,
    updatedAvailable,
  );
  TestValidator.equals(
    "storeIngredientPrice.last_updated is updated",
    updatedStoreIngredientPrice.last_updated,
    updatedLastUpdated,
  );
}
