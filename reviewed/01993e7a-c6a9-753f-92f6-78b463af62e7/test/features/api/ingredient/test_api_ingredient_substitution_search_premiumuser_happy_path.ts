import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingIngredientSubstitution";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validates the happy path for a premium user searching ingredient
 * substitutions.
 *
 * This test covers:
 *
 * 1. Creation and authentication of a premium user
 * 2. Creation of a regular user (to create an ingredient)
 * 3. Authentication of the regular user
 * 4. Creation of an ingredient by the regular user
 * 5. Authentication of the premium user again
 * 6. Searching substitutions for the created ingredient by the premium user
 * 7. Validation of the paginated substitution results
 */
export async function test_api_ingredient_substitution_search_premiumuser_happy_path(
  connection: api.IConnection,
) {
  // 1. Create a premium user
  const premiumUserEmail = typia.random<string & tags.Format<"email">>();
  const premiumUserPasswordHash = RandomGenerator.alphaNumeric(60); // e.g. bcrypt hash length
  const premiumUserUsername = RandomGenerator.name(2);

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: premiumUserEmail,
        password_hash: premiumUserPasswordHash,
        username: premiumUserUsername,
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(premiumUser);

  // 2. Create a regular user for ingredient creation
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(60);
  const regularUserUsername = RandomGenerator.name(2);

  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
        username: regularUserUsername,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 3. Login as the regular user to create ingredient
  const regularUserLogin: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
      } satisfies IRecipeSharingRegularUser.ILogin,
    });
  typia.assert(regularUserLogin);

  // 4. Create an ingredient by regular user
  const ingredientCreateBody = {
    name: RandomGenerator.name(1),
    brand: null,
  } satisfies IRecipeSharingIngredient.ICreate;

  const ingredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreateBody,
      },
    );
  typia.assert(ingredient);

  // 5. Login back as premium user
  const premiumUserLoginAgain: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.login(connection, {
      body: {
        email: premiumUserEmail,
        password_hash: premiumUserPasswordHash,
      } satisfies IRecipeSharingPremiumUser.ILogin,
    });
  typia.assert(premiumUserLoginAgain);

  // 6. Search substitutions for the created ingredient by premium user
  const substitutionSearchRequest: IRecipeSharingIngredientSubstitution.IRequest =
    {
      ingredient_id: ingredient.id,
    };

  const substitutions: IPageIRecipeSharingIngredientSubstitution.ISummary =
    await api.functional.recipeSharing.premiumUser.ingredients.substitutions.indexIngredientSubstitutions(
      connection,
      {
        ingredientId: ingredient.id,
        body: substitutionSearchRequest,
      },
    );
  typia.assert(substitutions);

  // 7. Validate substitution results include expected fields
  TestValidator.predicate(
    "substitutions data is array",
    Array.isArray(substitutions.data),
  );

  for (const substitution of substitutions.data) {
    typia.assert<IRecipeSharingIngredientSubstitution.ISummary>(substitution);
    TestValidator.predicate(
      "substitution.substitute_ingredient_id is uuid",
      typeof substitution.substitute_ingredient_id === "string" &&
        substitution.substitute_ingredient_id.length > 0,
    );
    TestValidator.predicate(
      "substitution.conversion_ratio is number",
      typeof substitution.conversion_ratio === "number",
    );
  }
}
