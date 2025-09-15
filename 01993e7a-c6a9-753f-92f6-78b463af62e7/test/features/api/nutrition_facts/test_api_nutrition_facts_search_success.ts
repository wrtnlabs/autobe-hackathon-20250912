import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingNutritionFact";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingNutritionFact } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingNutritionFact";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Tests the successful search of nutrition facts by a moderator with
 * filters.
 *
 * The test workflow includes:
 *
 * 1. Creating and authenticating a moderator user.
 * 2. Creating and authenticating a regular user.
 * 3. Regular user creates an ingredient.
 * 4. Moderator searches nutrition facts filtered by the ingredient id.
 * 5. Validates that all returned nutrition facts belong to the filtered
 *    ingredient.
 * 6. Validates pagination metadata.
 */
export async function test_api_nutrition_facts_search_success(
  connection: api.IConnection,
) {
  // 1. Create moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.name(2);
  // Moderator join
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPassword,
      username: moderatorUsername,
    } satisfies IRecipeSharingModerator.ICreate,
  });
  typia.assert(moderator);

  // Moderator login
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPassword,
    } satisfies IRecipeSharingModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // 2. Create regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const username = RandomGenerator.name(2);

  // Regular user join
  const regularUser = await api.functional.auth.regularUser.join(connection, {
    body: {
      email: userEmail,
      password_hash: userPassword,
      username,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });
  typia.assert(regularUser);

  // Regular user login
  const regularUserLogin = await api.functional.auth.regularUser.login(
    connection,
    {
      body: {
        email: userEmail,
        password_hash: userPassword,
      } satisfies IRecipeSharingRegularUser.ILogin,
    },
  );
  typia.assert(regularUserLogin);

  // 3. Regular user creates an ingredient
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

  // 4. Switch back to moderator login for search
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPassword,
    } satisfies IRecipeSharingModerator.ILogin,
  });

  // 5. Moderator searches nutrition facts filtered by ingredient id
  const searchBody = {
    ingredient_id: ingredient.id,
    page: 1,
    limit: 10,
  } satisfies IRecipeSharingNutritionFact.IRequest;
  const searchResult =
    await api.functional.recipeSharing.moderator.nutritionFacts.searchNutritionFacts(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(searchResult);

  // 6. Validate all nutrition facts belong to the filtered ingredient id
  for (const fact of searchResult.data) {
    TestValidator.equals(
      "Nutrition fact ingredient ID matches filter",
      fact.ingredient_id,
      ingredient.id,
    );
  }

  // Validate pagination values
  TestValidator.predicate(
    "Pagination current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination limit matches request",
    searchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "Pagination total records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination total pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
}
