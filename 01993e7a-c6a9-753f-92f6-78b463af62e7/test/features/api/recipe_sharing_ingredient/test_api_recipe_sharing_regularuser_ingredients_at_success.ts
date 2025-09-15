import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test covers the full workflow for authenticated regular user
 * operations on ingredients.
 *
 * Steps:
 *
 * 1. Create a new regular user using the join endpoint, with all required
 *    fields.
 * 2. Log in the created user for authorization.
 * 3. Create an ingredient with valid 'name' and optional 'brand'.
 * 4. Fetch the ingredient details by its generated UUID.
 * 5. Validate that the returned ingredient details match those created,
 *    including UUID format, timestamps, and text content.
 *
 * This scenario ensures the integrity of authentication and data across the
 * ingredient lifecycle for regular users.
 */
export async function test_api_recipe_sharing_regularuser_ingredients_at_success(
  connection: api.IConnection,
) {
  // 1. Regular user creation
  const email = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const username = RandomGenerator.name();

  const createUserBody = {
    email,
    password_hash: passwordHash,
    username,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createUserBody,
    });
  typia.assert(user);

  // 2. User login
  const loginBody = {
    email,
    password_hash: passwordHash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(authorizedUser);

  // 3. Create ingredient
  const ingredientName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 7,
  });
  const ingredientBrand = RandomGenerator.name();

  const createIngredientBody = {
    name: ingredientName,
    brand: ingredientBrand,
  } satisfies IRecipeSharingIngredient.ICreate;

  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: createIngredientBody,
      },
    );
  typia.assert(ingredient);

  // Validate that the created ingredient matches sent data
  TestValidator.equals(
    "ingredient name matches",
    ingredient.name,
    ingredientName,
  );
  TestValidator.equals(
    "ingredient brand matches",
    ingredient.brand,
    ingredientBrand,
  );

  // 4. Fetch ingredient by ID
  const foundIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.at(connection, {
      ingredientId: ingredient.id,
    });
  typia.assert(foundIngredient);

  // 5. Validate fetched ingredient matches created ingredient
  TestValidator.equals(
    "fetched ingredient id matches",
    foundIngredient.id,
    ingredient.id,
  );
  TestValidator.equals(
    "fetched ingredient name matches",
    foundIngredient.name,
    ingredient.name,
  );
  TestValidator.equals(
    "fetched ingredient brand matches",
    foundIngredient.brand,
    ingredient.brand,
  );

  // Ensure created_at and updated_at are valid ISO date-time strings
  TestValidator.predicate(
    "ingredient has valid created_at",
    typeof foundIngredient.created_at === "string" &&
      foundIngredient.created_at.length > 0,
  );
  TestValidator.predicate(
    "ingredient has valid updated_at",
    typeof foundIngredient.updated_at === "string" &&
      foundIngredient.updated_at.length > 0,
  );
}
