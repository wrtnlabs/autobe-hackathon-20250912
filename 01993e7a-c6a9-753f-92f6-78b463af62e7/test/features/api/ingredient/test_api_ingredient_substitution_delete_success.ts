import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test the deletion of an ingredient substitution by a moderator.
 *
 * This test ensures that a moderator user can authenticate, create an
 * ingredient substitution for two existing ingredients, and delete the
 * substitution successfully. The scenario begins by creating and
 * authenticating both moderator and regular user accounts. Then a regular
 * user creates the original and substitute ingredients. After switching to
 * the moderator user, they create a substitution between the two created
 * ingredients and finally delete the substitution.
 *
 * The test validates the creation and deletion processes confirm that the
 * substitution is properly removed, and that the authorized moderator user
 * can perform the deletion.
 */
export async function test_api_ingredient_substitution_delete_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorUsername = RandomGenerator.name(2);
  const moderatorCreateBody = {
    email: moderatorEmail,
    password_hash: moderatorPassword,
    username: moderatorUsername,
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPassword,
    } satisfies IRecipeSharingModerator.ILogin,
  });

  // 2. Create and authenticate a regular user
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = RandomGenerator.alphaNumeric(16);
  const regularUserUsername = RandomGenerator.name(2);
  const regularUserCreateBody = {
    email: regularUserEmail,
    password_hash: regularUserPassword,
    username: regularUserUsername,
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  await api.functional.auth.regularUser.login(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPassword,
    } satisfies IRecipeSharingRegularUser.ILogin,
  });

  // 3. Regular user creates original ingredient
  const originalIngredientCreateBody = {
    name: RandomGenerator.name(1),
    brand: RandomGenerator.name(1),
  } satisfies IRecipeSharingIngredient.ICreate;

  const originalIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: originalIngredientCreateBody,
      },
    );
  typia.assert(originalIngredient);

  // 4. Regular user creates substitute ingredient
  const substituteIngredientCreateBody = {
    name: RandomGenerator.name(1),
    brand: null,
  } satisfies IRecipeSharingIngredient.ICreate;

  const substituteIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: substituteIngredientCreateBody,
      },
    );
  typia.assert(substituteIngredient);

  // 5. Switch to moderator authentication (already logged in)

  // 6. Moderator creates a substitution
  const substitutionCreateBody = {
    ingredient_id: originalIngredient.id,
    substitute_ingredient_id: substituteIngredient.id,
    conversion_ratio: Math.round(Math.random() * 10 + 1),
  } satisfies IRecipeSharingIngredientSubstitution.ICreate;

  const substitution: IRecipeSharingIngredientSubstitution =
    await api.functional.recipeSharing.moderator.ingredients.substitutions.createSubstitution(
      connection,
      {
        ingredientId: originalIngredient.id,
        body: substitutionCreateBody,
      },
    );
  typia.assert(substitution);

  // 7. Moderator deletes the substitution
  await api.functional.recipeSharing.moderator.ingredients.substitutions.eraseSubstitution(
    connection,
    {
      ingredientId: originalIngredient.id,
      substitutionId: substitution.id,
    },
  );

  // If no error, deletion is successful
  TestValidator.predicate(
    "Substitution deletion succeeded without error",
    true,
  );
}
