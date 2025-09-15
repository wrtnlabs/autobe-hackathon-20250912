import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_recipe_sharing_regularuser_ingredients_create_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password_hash: string = RandomGenerator.alphaNumeric(32);
  const username: string = RandomGenerator.name(2);
  const createBody = {
    email,
    password_hash,
    username,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createBody,
    });
  typia.assert(user);

  // 2. Log in with the created user
  const loginBody = {
    email,
    password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create a new ingredient
  const ingredientName = RandomGenerator.name(1);
  const ingredientBrand = RandomGenerator.name(1);
  const ingredientBody = {
    name: ingredientName,
    brand: ingredientBrand,
  } satisfies IRecipeSharingIngredient.ICreate;

  const newIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      { body: ingredientBody },
    );

  typia.assert(newIngredient);

  // 4. Validate the response attributes
  TestValidator.predicate(
    "ingredient id is a valid UUID",
    typeof newIngredient.id === "string" &&
      /^[0-9a-f-]{36}$/i.test(newIngredient.id),
  );
  TestValidator.equals(
    "ingredient name matches",
    newIngredient.name,
    ingredientName,
  );
  TestValidator.equals(
    "ingredient brand matches",
    newIngredient.brand,
    ingredientBrand,
  );
  TestValidator.predicate(
    "ingredient created_at is ISO 8601 date-time string",
    typeof newIngredient.created_at === "string" &&
      !isNaN(Date.parse(newIngredient.created_at)),
  );
  TestValidator.predicate(
    "ingredient updated_at is ISO 8601 date-time string",
    typeof newIngredient.updated_at === "string" &&
      !isNaN(Date.parse(newIngredient.updated_at)),
  );
}
