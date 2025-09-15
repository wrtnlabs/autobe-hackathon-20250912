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
 * This end-to-end test validates the creation of ingredient substitutions
 * within the recipe sharing system.
 *
 * The scenario covers:
 *
 * 1. Moderator user registration and authentication.
 * 2. Regular user registration and authentication.
 * 3. Creation of two ingredients by the regular user: an original ingredient
 *    and a substitute ingredient.
 * 4. Moderator role authentication and creation of ingredient substitution
 *    linked to the previously created ingredients.
 * 5. Validation that the substitution's properties match the input and that
 *    the moderation status is "pending".
 * 6. Negative tests to confirm authorization restrictions and validation
 *    errors when using invalid ingredient IDs or unauthorized roles.
 *
 * This test verifies proper API behaviors, authorization flows, data
 * integrity, and error handling for the ingredient substitution creation
 * endpoint.
 */
export async function test_api_ingredient_substitution_create_success_and_failure(
  connection: api.IConnection,
) {
  // Step 1: Moderator user registration
  const moderatorEmail = `${RandomGenerator.alphabets(3)}@example.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
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
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorCreateBody.email,
  );

  // Moderator login
  const moderatorLoginBody = {
    email: moderatorCreateBody.email,
    password_hash: moderatorCreateBody.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;
  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginBody,
  });

  // Step 2: Regular user registration
  const regularUserEmail = `${RandomGenerator.alphabets(5)}@example.net`;
  const regularUserPassword = RandomGenerator.alphaNumeric(15);
  const regularUserUsername = RandomGenerator.name(3);
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
  TestValidator.equals(
    "regularUser email matches",
    regularUser.email,
    regularUserCreateBody.email,
  );

  // Regular user login
  const regularUserLoginBody = {
    email: regularUserCreateBody.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  await api.functional.auth.regularUser.login(connection, {
    body: regularUserLoginBody,
  });

  // Step 3: Create original ingredient
  const originalIngredientCreateBody = {
    name: `Original ${RandomGenerator.name()}`,
    brand: `Brand${RandomGenerator.alphaNumeric(3)}`,
  } satisfies IRecipeSharingIngredient.ICreate;
  const originalIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: originalIngredientCreateBody,
      },
    );
  typia.assert(originalIngredient);
  TestValidator.equals(
    "original ingredient name matches",
    originalIngredient.name,
    originalIngredientCreateBody.name,
  );

  // Create substitute ingredient
  const substituteIngredientCreateBody = {
    name: `Substitute ${RandomGenerator.name()}`,
    brand: `Brand${RandomGenerator.alphaNumeric(3)}`,
  } satisfies IRecipeSharingIngredient.ICreate;
  const substituteIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: substituteIngredientCreateBody,
      },
    );
  typia.assert(substituteIngredient);
  TestValidator.equals(
    "substitute ingredient name matches",
    substituteIngredient.name,
    substituteIngredientCreateBody.name,
  );

  // Step 4: Moderator login to perform substitution creation
  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginBody,
  });

  // Step 5: Create ingredient substitution
  const conversionRatio =
    Number((Math.random() * (3 - 0.1) + 0.1).toFixed(2)) || 1.0; // realistic 0.1 to 3.0
  const substitutionCreateBody = {
    ingredient_id: originalIngredient.id,
    substitute_ingredient_id: substituteIngredient.id,
    conversion_ratio: conversionRatio,
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

  // Step 6: Validate substitution response
  TestValidator.equals(
    "substitution original ingredient ID matches",
    substitution.ingredient_id,
    substitutionCreateBody.ingredient_id,
  );
  TestValidator.equals(
    "substitution substitute ingredient ID matches",
    substitution.substitute_ingredient_id,
    substitutionCreateBody.substitute_ingredient_id,
  );
  TestValidator.equals(
    "substitution conversion ratio matches",
    substitution.conversion_ratio,
    substitutionCreateBody.conversion_ratio,
  );
  TestValidator.equals(
    "substitution status is pending",
    substitution.status,
    "pending",
  );

  // Step 7: Negative test - unauthorized (regular user) attempting substitution creation
  await api.functional.auth.regularUser.login(connection, {
    body: regularUserLoginBody,
  });
  await TestValidator.error(
    "unauthorized user cannot create substitution",
    async () => {
      await api.functional.recipeSharing.moderator.ingredients.substitutions.createSubstitution(
        connection,
        {
          ingredientId: originalIngredient.id,
          body: substitutionCreateBody,
        },
      );
    },
  );

  // Step 8: Negative test - invalid ingredient ID
  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginBody,
  });
  const invalidIngredientId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "create substitution with invalid ingredientId fails",
    async () => {
      await api.functional.recipeSharing.moderator.ingredients.substitutions.createSubstitution(
        connection,
        {
          ingredientId: invalidIngredientId,
          body: {
            ...substitutionCreateBody,
            ingredient_id: invalidIngredientId,
          },
        },
      );
    },
  );
}
