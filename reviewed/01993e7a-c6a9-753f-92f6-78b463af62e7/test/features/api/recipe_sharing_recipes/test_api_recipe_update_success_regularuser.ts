import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_recipe_update_success_regularuser(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const userBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user = await api.functional.auth.regularUser.join(connection, {
    body: userBody,
  });
  typia.assert(user);

  // 2. Log in the registered user
  const loginBody = {
    email: user.email,
    password_hash: userBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loggedInUser = await api.functional.auth.regularUser.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInUser);

  // 3. Create a new recipe
  const createBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "draft",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe = await api.functional.recipeSharing.regularUser.recipes.create(
    connection,
    { body: createBody },
  );
  typia.assert(recipe);

  // 4. Update the created recipe with new data
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "published",
  } satisfies IRecipeSharingRecipes.IUpdate;
  const updatedRecipe =
    await api.functional.recipeSharing.regularUser.recipes.update(connection, {
      recipeId: recipe.id,
      body: updateBody,
    });
  typia.assert(updatedRecipe);

  // 5. Validate updates
  TestValidator.equals(
    "updated recipe id matches",
    updatedRecipe.id,
    recipe.id,
  );
  TestValidator.equals(
    "updated title matches",
    updatedRecipe.title,
    updateBody.title,
  );
  TestValidator.equals(
    "updated description matches",
    updatedRecipe.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated status matches",
    updatedRecipe.status,
    updateBody.status,
  );
  TestValidator.predicate(
    "updated_at is newer after update",
    updatedRecipe.updated_at > recipe.updated_at,
  );
}
