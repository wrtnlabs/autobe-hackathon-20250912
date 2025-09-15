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
 * Test retrieving a recipe by ID including success case of fetching complete
 * recipe details and failure cases such as non-existent recipe ID or
 * unauthorized access by users other than the owner.
 */
export async function test_api_recipe_get_by_id_success_and_failure(
  connection: api.IConnection,
) {
  // Create first user
  const email1: string =
    RandomGenerator.alphaNumeric(8).toLowerCase() + "@example.com";
  const passwordHash1: string = RandomGenerator.alphaNumeric(32);
  const username1: string = RandomGenerator.name();
  const user1: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: email1,
        password_hash: passwordHash1,
        username: username1,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user1);

  // Create a recipe owned by user1
  const title1: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const description1: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 7,
    wordMin: 4,
    wordMax: 8,
  });
  const status1: string = "published";
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: {
        created_by_id: user1.id,
        title: title1,
        description: description1,
        status: status1,
      } satisfies IRecipeSharingRecipes.ICreate,
    });
  typia.assert(recipe);

  // Success case: Search by the exact recipe id
  const summaryPage: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        // filter by created_by_id = user1.id
        created_by_id: user1.id,
        limit: 10,
        page: 1,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(summaryPage);

  const found = summaryPage.data.find((item) => item.id === recipe.id);
  TestValidator.predicate(
    "Recipe with created ID is present",
    found !== undefined,
  );
  if (found !== undefined) {
    TestValidator.equals("Recipe ID matches", found.id, recipe.id);
    TestValidator.equals("Recipe title matches", found.title, recipe.title);
    TestValidator.equals("Recipe status matches", found.status, recipe.status);
  }

  // Failure case: Search with a non-existent recipe id
  const fakeId: string = typia.random<string & tags.Format<"uuid">>();
  const nonExistentPage: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        created_by_id: fakeId, // non-existent user ID
        limit: 10,
        page: 1,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(nonExistentPage);
  TestValidator.equals(
    "No recipes for non-existent user",
    nonExistentPage.data.length,
    0,
  );

  // Authorization failure: Create a second user and authenticate
  const email2: string =
    RandomGenerator.alphaNumeric(8).toLowerCase() + "@example.net";
  const passwordHash2: string = RandomGenerator.alphaNumeric(32);
  const username2: string = RandomGenerator.name();
  const user2: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: email2,
        password_hash: passwordHash2,
        username: username2,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user2);

  // User 2 searches for user 1's recipes by specifying created_by_id of user 1
  const unauthorizedPage: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        created_by_id: user1.id,
        limit: 10,
        page: 1,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(unauthorizedPage);

  // Verify that no recipes are returned as user 2 should not see user 1's recipes
  TestValidator.predicate(
    "User 2 should not access User 1's recipes",
    unauthorizedPage.data.length === 0,
  );
}
