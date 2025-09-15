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
 * Test recipe create and search (but not update, as no update API exists) with
 * validation of ownership and unauthorized access.
 *
 * The test covers:
 *
 * - RegularUser join and authentication
 * - Recipe creation with unique titles
 * - Searching recipes filtered by owner, title, status
 * - Unauthorized user cannot see recipes of others
 * - Searching for non-existing recipes
 */
export async function test_api_recipe_update_success_and_failure(
  connection: api.IConnection,
) {
  // 1. RegularUser1 joins to create user1
  const user1Email: string = typia.random<string & tags.Format<"email">>();
  const user1PasswordHash = "hashed_password_1";
  const user1Username: string = RandomGenerator.name(2);
  const user1: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: user1Email,
        password_hash: user1PasswordHash,
        username: user1Username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user1);

  // 2. User1 creates a recipe
  const recipeTitle1: string = `Recipe Title 1 ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 7 })}`;
  const recipeDescription1: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const recipeStatus1: string = "draft";

  const recipe1: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: {
        created_by_id: user1.id,
        title: recipeTitle1,
        description: recipeDescription1,
        status: recipeStatus1,
      } satisfies IRecipeSharingRecipes.ICreate,
    });
  typia.assert(recipe1);

  // 3. User1 creates a second recipe with different title
  const recipeTitle2: string = `Recipe Title 2 ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 7 })}`;
  const recipeDescription2: string = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 6,
    sentenceMax: 9,
    wordMin: 5,
    wordMax: 9,
  });
  const recipeStatus2: string = "published";

  const recipe2: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: {
        created_by_id: user1.id,
        title: recipeTitle2,
        description: recipeDescription2,
        status: recipeStatus2,
      } satisfies IRecipeSharingRecipes.ICreate,
    });
  typia.assert(recipe2);

  // 4. Another RegularUser (user2) joins
  const user2Email: string = typia.random<string & tags.Format<"email">>();
  const user2PasswordHash = "hashed_password_2";
  const user2Username: string = RandomGenerator.name(2);
  const user2: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: user2Email,
        password_hash: user2PasswordHash,
        username: user2Username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user2);

  // 5. User2 creates a recipe
  const recipeTitle3: string = `Recipe Title 3 ${RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 7 })}`;
  const recipeDescription3: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 7,
    wordMin: 4,
    wordMax: 8,
  });
  const recipeStatus3: string = "draft";

  const recipe3: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: {
        created_by_id: user2.id,
        title: recipeTitle3,
        description: recipeDescription3,
        status: recipeStatus3,
      } satisfies IRecipeSharingRecipes.ICreate,
    });
  typia.assert(recipe3);

  // 6. User1 searches for own recipes (filter created_by_id)
  const user1RecipesPage: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        created_by_id: user1.id,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(user1RecipesPage);

  TestValidator.predicate(
    "user1 recipes page data contains recipe1",
    user1RecipesPage.data.some((r) => r.title === recipeTitle1),
  );
  TestValidator.predicate(
    "user1 recipes page data contains recipe2",
    user1RecipesPage.data.some((r) => r.title === recipeTitle2),
  );

  // 7. User2 searches own recipes
  const user2RecipesPage: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        created_by_id: user2.id,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(user2RecipesPage);
  TestValidator.predicate(
    "user2 recipes page data contains recipe3",
    user2RecipesPage.data.some((r) => r.title === recipeTitle3),
  );
  TestValidator.predicate(
    "user2 recipes page data does not contain user1 recipe",
    !user2RecipesPage.data.some((r) => r.title === recipeTitle1),
  );

  // 8. Search recipes by title
  const searchByTitlePage: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        title: recipeTitle2,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(searchByTitlePage);
  TestValidator.predicate(
    "search by title returns correct recipe",
    searchByTitlePage.data.length > 0 &&
      searchByTitlePage.data[0].title === recipeTitle2,
  );

  // 9. Search by status
  const searchByStatusPage: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        status: "published",
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(searchByStatusPage);
  TestValidator.predicate(
    "search by status returns only published recipes",
    searchByStatusPage.data.every((r) => r.status === "published"),
  );

  // 10. Search non-existent recipe
  const searchNonExistentPage: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        title: "Non-existent recipe title 123456789",
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(searchNonExistentPage);
  TestValidator.predicate(
    "search for non-existent recipe returns empty data",
    searchNonExistentPage.data.length === 0,
  );
}
