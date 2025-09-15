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
 * Happy path E2E test for regular user retrieving detailed information of a
 * specific ingredient substitution.
 *
 * This test fully covers the business flow of:
 *
 * 1. Creating a regular user and logging in.
 * 2. Creating both original and substitute ingredients.
 * 3. Creating a substitution entry linking those ingredients by a moderator.
 * 4. Switching back to regular user and retrieving the substitution details.
 *
 * It asserts type safety and content correctness at each step using
 * typia.assert and TestValidator.
 */
export async function test_api_ingredient_substitution_retrieve_regularuser_happy_path(
  connection: api.IConnection,
) {
  // 1. Regular user joins
  const regularUserCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserCreate,
    });
  typia.assert(regularUser);

  // 2. Regular user logs in
  const regularUserLogin: IRecipeSharingRegularUser.ILogin = {
    email: regularUserCreate.email,
    password_hash: regularUserCreate.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInRegularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: regularUserLogin,
    });
  typia.assert(loggedInRegularUser);

  // 3. Create original ingredient as regular user
  const originalIngredientCreate = {
    name: `OriginalIngredient ${RandomGenerator.name(1)}`,
    brand: RandomGenerator.name(),
  } satisfies IRecipeSharingIngredient.ICreate;

  const originalIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: originalIngredientCreate,
      },
    );
  typia.assert(originalIngredient);

  // 4. Create substitute ingredient as regular user
  const substituteIngredientCreate = {
    name: `SubstituteIngredient ${RandomGenerator.name(1)}`,
    brand: RandomGenerator.name(),
  } satisfies IRecipeSharingIngredient.ICreate;

  const substituteIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: substituteIngredientCreate,
      },
    );
  typia.assert(substituteIngredient);

  // 5. Moderator joins
  const moderatorCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // 6. Moderator logs in
  const moderatorLogin = {
    email: moderatorCreate.email,
    password_hash: moderatorCreate.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;

  const loggedInModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLogin,
    });
  typia.assert(loggedInModerator);

  // 7. Moderator creates substitution
  const substitutionCreate = {
    ingredient_id: originalIngredient.id,
    substitute_ingredient_id: substituteIngredient.id,
    conversion_ratio: Math.round((Math.random() * 9 + 1) * 10) / 10, // e.g., 1.0 to 10.0
  } satisfies IRecipeSharingIngredientSubstitution.ICreate;

  const substitution: IRecipeSharingIngredientSubstitution =
    await api.functional.recipeSharing.moderator.ingredients.substitutions.createSubstitution(
      connection,
      {
        ingredientId: substitutionCreate.ingredient_id,
        body: substitutionCreate,
      },
    );
  typia.assert(substitution);

  // 8. Switch back to regular user login
  const regularUserReLogin: IRecipeSharingRegularUser.ILogin = {
    email: regularUserCreate.email,
    password_hash: regularUserCreate.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInRegUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: regularUserReLogin,
    });
  typia.assert(loggedInRegUser);

  // 9. Regular user retrieves substitution details
  const substitutionDetails: IRecipeSharingIngredientSubstitution =
    await api.functional.recipeSharing.regularUser.ingredients.substitutions.atIngredientSubstitution(
      connection,
      {
        ingredientId: originalIngredient.id,
        substitutionId: substitution.id,
      },
    );
  typia.assert(substitutionDetails);

  TestValidator.equals(
    "Ingredient ID should match",
    substitutionDetails.ingredient_id,
    originalIngredient.id,
  );
  TestValidator.equals(
    "Substitute Ingredient ID should match",
    substitutionDetails.substitute_ingredient_id,
    substituteIngredient.id,
  );
  TestValidator.equals(
    "Conversion ratio should match",
    substitutionDetails.conversion_ratio,
    substitutionCreate.conversion_ratio,
  );
  TestValidator.predicate(
    "Status should be a valid enum value",
    ["pending", "approved", "rejected"].includes(substitutionDetails.status),
  );
}
