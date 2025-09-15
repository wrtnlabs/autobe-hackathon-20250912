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
 * E2E test for creating a store ingredient price successfully as a premium
 * user.
 *
 * This test performs the full business workflow:
 *
 * 1. Create premium user account and login.
 * 2. Create moderator account and login for grocery store creation.
 * 3. Create regular user account and login for ingredient creation.
 * 4. Use created IDs to create store ingredient price as premium user.
 * 5. Validate all API responses and type assertions.
 */
export async function test_api_store_ingredient_price_creation_success_premiumuser(
  connection: api.IConnection,
) {
  // 1. Create a premium user account
  const premiumUserEmail = `premium_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const premiumUserPasswordHash = RandomGenerator.alphaNumeric(32);
  const premiumUsername = RandomGenerator.name(2);
  const premiumUser = await api.functional.auth.premiumUser.join(connection, {
    body: {
      email: premiumUserEmail,
      password_hash: premiumUserPasswordHash,
      username: premiumUsername,
    } satisfies IRecipeSharingPremiumUser.ICreate,
  });
  typia.assert(premiumUser);

  // 2. Create a moderator user account for grocery store creation
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderatorUsername = RandomGenerator.name(2);
  const moderatorUser = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPasswordHash,
      username: moderatorUsername,
    } satisfies IRecipeSharingModerator.ICreate,
  });
  typia.assert(moderatorUser);

  // 3. Moderator login to authenticate
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPasswordHash,
    } satisfies IRecipeSharingModerator.ILogin,
  });

  // 4. Create a grocery store record
  const groceryStoreName = RandomGenerator.name(3);
  const groceryStoreAddress = RandomGenerator.paragraph({ sentences: 5 });
  const groceryStorePhone = RandomGenerator.mobile();
  const groceryStoreWebsiteUrl = `https://${RandomGenerator.name(1)}.com`;
  const groceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: {
          name: groceryStoreName,
          address: groceryStoreAddress,
          phone: groceryStorePhone,
          website_url: groceryStoreWebsiteUrl,
        } satisfies IRecipeSharingGroceryStore.ICreate,
      },
    );
  typia.assert(groceryStore);

  // 5. Create a regular user account for ingredient creation
  const regularUserEmail = `regular_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(32);
  const regularUsername = RandomGenerator.name(2);
  const regularUser = await api.functional.auth.regularUser.join(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPasswordHash,
      username: regularUsername,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });
  typia.assert(regularUser);

  // 6. Regular user login to authenticate
  await api.functional.auth.regularUser.login(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPasswordHash,
    } satisfies IRecipeSharingRegularUser.ILogin,
  });

  // 7. Create an ingredient record
  const ingredientName = RandomGenerator.name(2);
  const ingredientBrand = RandomGenerator.name(1);
  const ingredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: {
          name: ingredientName,
          brand: ingredientBrand,
        } satisfies IRecipeSharingIngredient.ICreate,
      },
    );
  typia.assert(ingredient);

  // 8. Login premium user again to create the store ingredient price
  await api.functional.auth.premiumUser.login(connection, {
    body: {
      email: premiumUserEmail,
      password_hash: premiumUserPasswordHash,
    } satisfies IRecipeSharingPremiumUser.ILogin,
  });

  // 9. Prepare store ingredient price data
  const price = Math.floor(Math.random() * 10000) / 100 + 1; // price between 1 and 100
  const availability = true;
  const lastUpdated = new Date().toISOString();

  // 10. Create store ingredient price record
  const storeIngredientPrice =
    await api.functional.recipeSharing.premiumUser.storeIngredientPrices.create(
      connection,
      {
        body: {
          grocery_store_id: groceryStore.id satisfies string &
            tags.Format<"uuid">,
          ingredient_id: ingredient.id satisfies string & tags.Format<"uuid">,
          price: price,
          available: availability,
          last_updated: lastUpdated,
        } satisfies IRecipeSharingStoreIngredientPrice.ICreate,
      },
    );
  typia.assert(storeIngredientPrice);

  // 11. Validate returned properties
  TestValidator.equals(
    "grocery_store_id matches",
    storeIngredientPrice.grocery_store_id,
    groceryStore.id,
  );
  TestValidator.equals(
    "ingredient_id matches",
    storeIngredientPrice.ingredient_id,
    ingredient.id,
  );
  TestValidator.predicate("price positive", storeIngredientPrice.price > 0);
  TestValidator.equals(
    "availability is true",
    storeIngredientPrice.available,
    true,
  );
  TestValidator.equals(
    "last_updated is ISO string",
    storeIngredientPrice.last_updated,
    lastUpdated,
  );
}
