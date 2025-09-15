import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingIngredientSubstitution";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Happy path E2E test for a regular user searching ingredient substitutions
 * by ingredientId.
 *
 * This test validates the full workflow from regular user creation and
 * authentication, through creating an ingredient, to searching for
 * ingredient substitutions.
 *
 * Steps:
 *
 * 1. Create a new regular user with randomized email, username, and password
 *    hash.
 * 2. Log in with the created regular user credentials to establish
 *    authentication.
 * 3. Create a new ingredient with a name and optional brand.
 * 4. Search ingredient substitutions for the created ingredientId with no
 *    filters.
 *
 * Validations:
 *
 * - All API responses conform to expected TypeScript DTO types.
 * - Pagination data contains valid numeric values.
 * - Each substitution record contains valid UUIDs, positive conversion
 *   ratios, and valid status strings.
 *
 * Authentication tokens are automatically handled by the SDK. No invalid or
 * undeclared properties are sent in requests.
 */
export async function test_api_ingredient_substitution_search_regularuser_happy_path(
  connection: api.IConnection,
) {
  // 1. Create a new regular user
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const userAuthorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(userAuthorized);

  // 2. Login with created user
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const userLoggedIn: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userLoggedIn);

  // 3. Create an ingredient
  const ingredientCreateBody = {
    name: RandomGenerator.name(2),
    brand: RandomGenerator.name(1),
  } satisfies IRecipeSharingIngredient.ICreate;

  const createdIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: ingredientCreateBody,
      },
    );
  typia.assert(createdIngredient);

  // 4. Search ingredient substitutions by ingredientId
  const substitutionSearchRequest =
    {} satisfies IRecipeSharingIngredientSubstitution.IRequest;

  const substitutionSearchResult: IPageIRecipeSharingIngredientSubstitution.ISummary =
    await api.functional.recipeSharing.regularUser.ingredients.substitutions.indexIngredientSubstitutions(
      connection,
      {
        ingredientId: createdIngredient.id,
        body: substitutionSearchRequest,
      },
    );
  typia.assert(substitutionSearchResult);

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current is non-negative",
    substitutionSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    substitutionSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    substitutionSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    substitutionSearchResult.pagination.pages >= 0,
  );

  // Validate each substitution data item
  substitutionSearchResult.data.forEach((substitution) => {
    typia.assert(substitution);
    TestValidator.predicate(
      "substitution id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        substitution.id,
      ),
    );
    TestValidator.equals(
      "substitution ingredient_id matches query ingredientId",
      substitution.ingredient_id,
      createdIngredient.id,
    );
    TestValidator.predicate(
      "conversion_ratio is positive number",
      substitution.conversion_ratio > 0,
    );
    TestValidator.predicate(
      "status is a non-empty string",
      typeof substitution.status === "string" && substitution.status.length > 0,
    );
  });
}
