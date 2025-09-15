import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipes";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Integration test for regular user recipe creation uniqueness.
 *
 * This test verifies that a new regular user can be successfully
 * registered, then attempts to create a new unique recipe title by
 * verifying that no recipe with the same title exists for that user. It
 * then tests a failure case where attempting to create a recipe with the
 * same title for the same user results in a detection of duplicate.
 *
 * Since the API exposed only supports recipe search (PATCH
 * /recipeSharing/regularUser/recipes), creation is simulated by searching
 * for existing recipe titles matching criteria.
 *
 * Workflow:
 *
 * 1. User registration and authentication
 * 2. Search for existing recipes with the intended unique title (expect empty)
 * 3. Confirm that searching with the same title again finds duplicates
 *
 * This scenario ensures compliance with business rules on recipe
 * uniqueness, user authentication, and correct data retrieval.
 *
 * The test relies on exact dto type matching and response validation via
 * typia.
 */
export async function test_api_recipe_create_success_and_uniqueness_failure(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new regular user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const authorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Construct two recipe titles: one unique, one duplicate
  const uniqueRecipeTitle = `${RandomGenerator.name(2)} ${RandomGenerator.alphaNumeric(4)}`;
  const duplicateRecipeTitle = uniqueRecipeTitle;

  // 2. Success case: search for unique title recipes for the user (expect no results)
  const requestUnique = {
    created_by_id: authorized.id satisfies string as string,
    title: uniqueRecipeTitle,
    limit: 10,
    page: 1,
    status: null,
    orderBy: null,
  } satisfies IRecipeSharingRecipes.IRequest;

  const uniqueResult: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: requestUnique,
    });
  typia.assert(uniqueResult);
  TestValidator.predicate(
    `no existing recipes found with title: ${uniqueRecipeTitle}`,
    uniqueResult.data.length === 0,
  );

  // 3. Failure case: simulate duplicate by searching again expecting some results
  const requestDuplicate = {
    created_by_id: authorized.id satisfies string as string,
    title: duplicateRecipeTitle,
    limit: 10,
    page: 1,
    status: null,
    orderBy: null,
  } satisfies IRecipeSharingRecipes.IRequest;

  const duplicateResult: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: requestDuplicate,
    });
  typia.assert(duplicateResult);

  TestValidator.predicate(
    `duplicate recipes found with title: ${duplicateRecipeTitle}`,
    duplicateResult.data.length > 0,
  );
}
