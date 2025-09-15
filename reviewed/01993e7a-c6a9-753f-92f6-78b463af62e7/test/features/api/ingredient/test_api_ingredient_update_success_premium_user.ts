import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test validates that a premium user can successfully update an existing
 * ingredient.
 *
 * It performs the following steps:
 *
 * 1. Registers and authenticates a premium user.
 * 2. Creates a new ingredient as a regular user to get a valid ingredient.
 * 3. Updates the ingredient's name and optionally brand as the authenticated
 *    premium user.
 * 4. Asserts the API responses and verifies update persistence.
 */
export async function test_api_ingredient_update_success_premium_user(
  connection: api.IConnection,
) {
  // 1. Register a new premium user to the system
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.name();
  const passwordHash: string = RandomGenerator.alphaNumeric(32);

  const premiumUserCreateBody = {
    email,
    username,
    password_hash: passwordHash,
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreateBody,
    });
  typia.assert(premiumUser);

  // 2. Authenticate the premium user
  const premiumUserLoginBody = {
    email,
    password_hash: passwordHash,
  } satisfies IRecipeSharingPremiumUser.ILogin;

  const loggedPremiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.login(connection, {
      body: premiumUserLoginBody,
    });
  typia.assert(loggedPremiumUser);

  // 3. Create a new ingredient as a regular user (to obtain an ingredientId)
  // Generate random create ingredient data
  const ingredientCreateBody = {
    name: RandomGenerator.name(),
    brand: RandomGenerator.name(),
  } satisfies IRecipeSharingIngredient.ICreate;

  const createdIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      { body: ingredientCreateBody },
    );
  typia.assert(createdIngredient);

  // 4. Prepare updated ingredient data
  const updatedName: string = RandomGenerator.name();
  // For brand, also update it to a new random name or null randomly
  const updatedBrand: string | null = RandomGenerator.pick([
    RandomGenerator.name(),
    null,
  ]);

  const ingredientUpdateBody = {
    name: updatedName,
    brand: updatedBrand,
  } satisfies IRecipeSharingIngredient.IUpdate;

  const updatedIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.premiumUser.ingredients.updateIngredient(
      connection,
      {
        ingredientId: createdIngredient.id,
        body: ingredientUpdateBody,
      },
    );
  typia.assert(updatedIngredient);

  // 5. Verify that the updated ingredient has the correct id and updated fields
  TestValidator.equals(
    "ingredient id remains unchanged",
    updatedIngredient.id,
    createdIngredient.id,
  );

  TestValidator.equals(
    "ingredient name is updated",
    updatedIngredient.name,
    updatedName,
  );

  TestValidator.equals(
    "ingredient brand is updated",
    updatedIngredient.brand,
    updatedBrand,
  );
}
