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

export async function test_api_store_ingredient_price_delete_success_moderator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate Moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(20);
  const moderatorUsername = RandomGenerator.name();
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create Grocery Store as Moderator
  const groceryStoreName = RandomGenerator.name();
  const groceryStoreAddress = RandomGenerator.paragraph({ sentences: 3 });
  const groceryStorePhone = RandomGenerator.mobile();
  const groceryStoreWebsite = `https://${RandomGenerator.alphaNumeric(8)}.com`;
  const groceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: {
          name: groceryStoreName,
          address: groceryStoreAddress,
          phone: groceryStorePhone,
          website_url: groceryStoreWebsite,
        } satisfies IRecipeSharingGroceryStore.ICreate,
      },
    );
  typia.assert(groceryStore);

  // 3. Create Ingredient as Regular User
  // First, create and authenticate Regular User
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(20);
  const regularUserUsername = RandomGenerator.name();
  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
        username: regularUserUsername,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(regularUser);

  const ingredientName = RandomGenerator.name();
  const ingredientBrand = RandomGenerator.alphaNumeric(5);
  const ingredient: IRecipeSharingIngredient =
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

  // 4. Create Store Ingredient Price record as Premium User
  // Create and authenticate Premium User
  const premiumUserEmail = typia.random<string & tags.Format<"email">>();
  const premiumUserPasswordHash = RandomGenerator.alphaNumeric(20);
  const premiumUserUsername = RandomGenerator.name();
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: premiumUserEmail,
        password_hash: premiumUserPasswordHash,
        username: premiumUserUsername,
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(premiumUser);

  // Generate realistic price info using typia.random
  const price = typia.random<number & tags.Type<"double">>();
  const available = true;
  const lastUpdated = new Date().toISOString();

  const storeIngredientPrice: IRecipeSharingStoreIngredientPrice =
    await api.functional.recipeSharing.premiumUser.storeIngredientPrices.create(
      connection,
      {
        body: {
          grocery_store_id: groceryStore.id,
          ingredient_id: ingredient.id,
          price: price,
          available: available,
          last_updated: lastUpdated,
        } satisfies IRecipeSharingStoreIngredientPrice.ICreate,
      },
    );
  typia.assert(storeIngredientPrice);

  // 5. Authenticate again as Moderator (role switching)
  const moderatorLogin: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
      } satisfies IRecipeSharingModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // 6. Perform DELETE of Store Ingredient Price by UUID
  await api.functional.recipeSharing.moderator.storeIngredientPrices.eraseStoreIngredientPrice(
    connection,
    {
      storeIngredientPriceId: storeIngredientPrice.id,
    },
  );
}
