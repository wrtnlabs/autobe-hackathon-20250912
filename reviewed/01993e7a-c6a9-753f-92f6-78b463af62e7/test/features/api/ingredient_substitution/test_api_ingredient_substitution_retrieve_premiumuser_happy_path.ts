import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Happy path for a premium user retrieving detailed information of a specific
 * ingredient substitution by ingredientId and substitutionId. The scenario
 * includes creating a premium user and logging in, creating the original
 * ingredient and the substitute ingredient, then creating the substitution
 * entry linking the two. The test verifies the retrieval of substitution
 * details including conversion_ratio and status fields.
 *
 * Workflow:
 *
 * 1. Create a premium user and login to setup authentication context.
 * 2. Create a regular user and login to create original and substitute
 *    ingredients.
 * 3. Create a moderator user and login to create the substitution entry.
 * 4. Retrieve the substitution details as the premium user and verify correctness.
 */
export async function test_api_ingredient_substitution_retrieve_premiumuser_happy_path(
  connection: api.IConnection,
) {
  // Step 1: Create premium user and login
  const premiumUserEmail = `${RandomGenerator.name(1).toLowerCase()}${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}@example.com`;
  const premiumUserPasswordHash = "hash" + RandomGenerator.alphaNumeric(10);
  const premiumUserCreateBody = {
    email: premiumUserEmail,
    password_hash: premiumUserPasswordHash,
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const premiumUser = await api.functional.auth.premiumUser.join(connection, {
    body: premiumUserCreateBody,
  });
  typia.assert(premiumUser);

  const premiumUserLoginBody = {
    email: premiumUserEmail,
    password_hash: premiumUserPasswordHash,
  } satisfies IRecipeSharingPremiumUser.ILogin;
  const premiumUserAuthorization = await api.functional.auth.premiumUser.login(
    connection,
    {
      body: premiumUserLoginBody,
    },
  );
  typia.assert(premiumUserAuthorization);

  // Step 2: Create regular user and login
  const regularUserEmail = `${RandomGenerator.name(1).toLowerCase()}${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}@example.com`;
  const regularUserPasswordHash = "hash" + RandomGenerator.alphaNumeric(10);
  const regularUserCreateBody = {
    email: regularUserEmail,
    password_hash: regularUserPasswordHash,
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const regularUser = await api.functional.auth.regularUser.join(connection, {
    body: regularUserCreateBody,
  });
  typia.assert(regularUser);

  const regularUserLoginBody = {
    email: regularUserEmail,
    password_hash: regularUserPasswordHash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  await api.functional.auth.regularUser.login(connection, {
    body: regularUserLoginBody,
  });

  // Step 3: Create original and substitute ingredients
  const originalIngredientCreateBody = {
    name: RandomGenerator.name(2),
    brand: RandomGenerator.name(1),
  } satisfies IRecipeSharingIngredient.ICreate;
  const originalIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: originalIngredientCreateBody,
      },
    );
  typia.assert(originalIngredient);

  const substituteIngredientCreateBody = {
    name: RandomGenerator.name(2),
    brand: RandomGenerator.name(1),
  } satisfies IRecipeSharingIngredient.ICreate;
  const substituteIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: substituteIngredientCreateBody,
      },
    );
  typia.assert(substituteIngredient);

  // Step 4: Create moderator user and login
  const moderatorEmail = `${RandomGenerator.name(1).toLowerCase()}${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}@modexample.com`;
  const moderatorPasswordHash = "hash" + RandomGenerator.alphaNumeric(10);
  const moderatorCreateBody = {
    email: moderatorEmail,
    password_hash: moderatorPasswordHash,
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateBody,
  });
  typia.assert(moderator);

  const moderatorLoginBody = {
    email: moderatorEmail,
    password_hash: moderatorPasswordHash,
  } satisfies IRecipeSharingModerator.ILogin;
  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginBody,
  });

  // Step 5: Create substitution
  const substitutionCreateBody = {
    ingredient_id: originalIngredient.id,
    substitute_ingredient_id: substituteIngredient.id,
    conversion_ratio: 1.5,
  } satisfies IRecipeSharingIngredientSubstitution.ICreate;
  const substitution =
    await api.functional.recipeSharing.moderator.ingredients.substitutions.createSubstitution(
      connection,
      {
        ingredientId: originalIngredient.id,
        body: substitutionCreateBody,
      },
    );
  typia.assert(substitution);

  // Step 6: Retrieve substitution as premium user
  const substitutionRetrieved =
    await api.functional.recipeSharing.premiumUser.ingredients.substitutions.atIngredientSubstitution(
      connection,
      {
        ingredientId: originalIngredient.id,
        substitutionId: substitution.id,
      },
    );
  typia.assert(substitutionRetrieved);

  // Validations
  TestValidator.equals(
    "ingredient ID matches",
    substitutionRetrieved.ingredient_id,
    originalIngredient.id,
  );
  TestValidator.equals(
    "substitute ingredient ID matches",
    substitutionRetrieved.substitute_ingredient_id,
    substituteIngredient.id,
  );
  TestValidator.equals(
    "substitution ID matches",
    substitutionRetrieved.id,
    substitution.id,
  );
  TestValidator.predicate(
    "conversion ratio is positive",
    substitutionRetrieved.conversion_ratio > 0,
  );
  TestValidator.predicate(
    "status is one of pending, approved, rejected",
    ["pending", "approved", "rejected"].includes(substitutionRetrieved.status),
  );
}
