import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test retrieving ingredient details by ingredientId. Include success cases
 * fetching all ingredient info including optional brand and failure cases
 * with non-existent ingredient ID or unauthorized access.
 */
export async function test_api_ingredient_get_by_id_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Create and authenticate regularUser
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.name(2);

  const createUserBody = {
    email,
    password_hash:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    username,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createUserBody,
    });
  typia.assert(user);

  // 2. Create an ingredient with optional brand
  const ingredientName = RandomGenerator.name(1);
  const ingredientBrand = RandomGenerator.name(1);
  const createIngredientBody = {
    name: ingredientName,
    brand: ingredientBrand,
  } satisfies IRecipeSharingIngredient.ICreate;

  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      { body: createIngredientBody },
    );
  typia.assert(ingredient);

  TestValidator.predicate(
    "Ingredient has id following uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      ingredient.id,
    ),
  );

  // 3. Fetch the created ingredient successfully
  const fetched: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.at(connection, {
      ingredientId: ingredient.id,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "fetched ingredient matches created ingredient",
    fetched.id,
    ingredient.id,
  );
  TestValidator.equals(
    "fetched ingredient name matches",
    fetched.name,
    ingredientName,
  );
  TestValidator.equals("fetched brand matches", fetched.brand, ingredientBrand);

  // 4. Try fetching with a non-existent ingredientId, expect error
  await TestValidator.error(
    "fetching non-existent ingredient should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.ingredients.at(
        connection,
        {
          ingredientId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Try fetching with unauthorized connection, expect error
  // Create a new connection without authorization headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "fetching ingredient without auth should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.ingredients.at(
        unauthConn,
        {
          ingredientId: ingredient.id,
        },
      );
    },
  );
}
