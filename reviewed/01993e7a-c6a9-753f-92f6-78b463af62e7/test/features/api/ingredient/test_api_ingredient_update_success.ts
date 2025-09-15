import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * End-to-End Test for updating an ingredient successfully.
 *
 * This test covers the realistic workflow:
 *
 * 1. Create a new regular user with unique email, username, and password_hash
 * 2. Login the regular user to establish a valid auth token
 * 3. Create a new ingredient with unique name
 * 4. Update the ingredient with new name and brand
 * 5. Assert that updated ingredient reflects the new values
 *
 * This validates proper authentication, path parameter usage, request body
 * typing, server response compliance, and business logic correctness.
 */
export async function test_api_ingredient_update_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const userAuthorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(userAuthorized);

  // 2. Login the newly created user
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loginAuthorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Create a new ingredient
  const ingredientCreateBody = {
    name: `Ingredient_${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IRecipeSharingIngredient.ICreate;
  const createdIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      { body: ingredientCreateBody },
    );
  typia.assert(createdIngredient);

  // 4. Update the ingredient with new name and brand
  const ingredientUpdateBody = {
    name: `${ingredientCreateBody.name}_Updated`,
    brand: `Brand_${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IRecipeSharingIngredient.IUpdate;
  const updatedIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.updateIngredient(
      connection,
      {
        ingredientId: createdIngredient.id,
        body: ingredientUpdateBody,
      },
    );
  typia.assert(updatedIngredient);

  // 5. Validate the updated ingredient matches the new values
  TestValidator.equals(
    "ingredient id unchanged",
    updatedIngredient.id,
    createdIngredient.id,
  );
  TestValidator.equals(
    "ingredient name updated",
    updatedIngredient.name,
    ingredientUpdateBody.name,
  );
  TestValidator.equals(
    "ingredient brand updated",
    updatedIngredient.brand,
    ingredientUpdateBody.brand ?? null,
  );
}
