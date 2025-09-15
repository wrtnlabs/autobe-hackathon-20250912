import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingStoreIngredientPrice";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";

/**
 * This E2E test verifies the process of a regularUser retrieving filtered
 * and paginated store ingredient prices.
 *
 * The workflow includes:
 *
 * 1. Register and login a regularUser to obtain auth tokens.
 * 2. Register and login a moderator to create a grocery store record.
 * 3. RegularUser creates an ingredient record.
 * 4. Register and login a premiumUser to create store ingredient price entries
 *    associated with the grocery store and ingredient.
 * 5. Switch back to regularUser and use the PATCH API to retrieve a filtered
 *    (by grocery_store_id, ingredient_id, availability true, price range)
 *    and sorted (ascending price) paginated list.
 * 6. Verify that pagination properties in the response are correct and all
 *    results satisfy the filters.
 * 7. Assert correct API responses and type compliance during each step.
 */
export async function test_api_store_ingredient_prices_list_filtered_pagination(
  connection: api.IConnection,
) {
  // 1. Regular user registration
  const regularUserCreate = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreate,
    });
  typia.assert(regularUser);

  // 2. Regular user login
  const regularUserLogin = {
    email: regularUserCreate.email,
    password_hash: regularUserCreate.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const regularUserLoggedIn = await api.functional.auth.regularUser.login(
    connection,
    {
      body: regularUserLogin,
    },
  );
  typia.assert(regularUserLoggedIn);

  // 3. Moderator registration
  const moderatorCreate = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // 4. Moderator login
  const moderatorLogin = {
    email: moderatorCreate.email,
    password_hash: moderatorCreate.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;
  const moderatorLoggedIn = await api.functional.auth.moderator.login(
    connection,
    {
      body: moderatorLogin,
    },
  );
  typia.assert(moderatorLoggedIn);

  // 5. Create grocery store as logged moderator
  const groceryStoreCreate = {
    name: RandomGenerator.name(3),
    address: RandomGenerator.paragraph({ sentences: 5 }),
    phone: "010-1234-" + RandomGenerator.alphaNumeric(4).slice(0, 4),
    website_url: "https://" + RandomGenerator.name(1) + ".com",
  } satisfies IRecipeSharingGroceryStore.ICreate;
  const groceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: groceryStoreCreate,
      },
    );
  typia.assert(groceryStore);

  // 6. Switch to regularUser login again to create ingredient
  await api.functional.auth.regularUser.login(connection, {
    body: regularUserLogin,
  });

  // 7. Create ingredient by regularUser
  const ingredientCreate = {
    name: RandomGenerator.name(3),
    brand: RandomGenerator.name(1),
  } satisfies IRecipeSharingIngredient.ICreate;
  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreate,
      },
    );
  typia.assert(ingredient);

  // 8. Switch to premiumUser join and login to create storeIngredientPrice entries
  const premiumUserCreate = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreate,
    });
  typia.assert(premiumUser);

  const premiumUserLogin = {
    email: premiumUserCreate.email,
    password_hash: premiumUserCreate.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;
  await api.functional.auth.premiumUser.login(connection, {
    body: premiumUserLogin,
  });

  // 9. Create multiple storeIngredientPrice entries with varied prices and availability
  const pricesToCreateCount = 5;
  const pricesToCreate = ArrayUtil.repeat(pricesToCreateCount, (i) => {
    const price = 100 + i * 10;
    const available = i % 2 === 0;
    return {
      grocery_store_id: groceryStore.id satisfies string,
      ingredient_id: ingredient.id satisfies string,
      price: price,
      available: available,
      last_updated: new Date(Date.now() - i * 1000000).toISOString(),
    } satisfies IRecipeSharingStoreIngredientPrice.ICreate;
  });

  for (const priceCreate of pricesToCreate) {
    const createdPrice =
      await api.functional.recipeSharing.premiumUser.storeIngredientPrices.create(
        connection,
        {
          body: priceCreate,
        },
      );
    typia.assert(createdPrice);
  }

  // 10. Switch back to regularUser login to perform PATCH for index
  await api.functional.auth.regularUser.login(connection, {
    body: regularUserLogin,
  });

  // 11. Perform filtered, sorted, and paginated index request
  const reqPage = 1;
  const reqLimit = 3;
  const filterRequest = {
    grocery_store_id: groceryStore.id,
    ingredient_id: ingredient.id,
    available: true,
    min_price: 100,
    max_price: 200,
    price_sort: "asc",
    page: reqPage,
    limit: reqLimit,
  } satisfies IRecipeSharingStoreIngredientPrice.IRequest;

  const indexResponse: IPageIRecipeSharingStoreIngredientPrice.ISummary =
    await api.functional.recipeSharing.regularUser.storeIngredientPrices.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(indexResponse);

  // 12. Validate pagination
  TestValidator.equals(
    "pagination current page",
    indexResponse.pagination.current,
    reqPage,
  );
  TestValidator.equals(
    "pagination limit",
    indexResponse.pagination.limit,
    reqLimit,
  );
  TestValidator.predicate(
    "pagination pages positive",
    indexResponse.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    indexResponse.pagination.records >= 0,
  );

  // 13. Validate each returned summary item
  for (const item of indexResponse.data) {
    typia.assert(item);
    TestValidator.equals(
      "grocery_store_id matches",
      item.grocery_store_id,
      groceryStore.id,
    );
    TestValidator.equals(
      "ingredient_id matches",
      item.ingredient_id,
      ingredient.id,
    );
    TestValidator.predicate("available is true", item.available === true);
    TestValidator.predicate(
      "price is within min_price and max_price",
      item.price >= filterRequest.min_price! &&
        item.price <= filterRequest.max_price!,
    );
  }

  // 14. Validate sort order ascending by price
  for (let i = 1; i < indexResponse.data.length; ++i) {
    TestValidator.predicate(
      `price ascending check index ${i - 1} <= index ${i}`,
      indexResponse.data[i - 1].price <= indexResponse.data[i].price,
    );
  }
}
