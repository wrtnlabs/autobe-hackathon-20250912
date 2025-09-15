import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_ingredient_substitution_update_success(
  connection: api.IConnection,
) {
  // 1. Moderator joins (signs up)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderatorUsername = RandomGenerator.name(2);
  const moderatorUser: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderatorUser);

  // 2. Moderator logs in for role switch (authentication context)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPasswordHash,
    } satisfies IRecipeSharingModerator.ILogin,
  });

  // 3. Regular user joins (signs up)
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(32);
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

  // 4. Regular user logs in for role switch
  await api.functional.auth.regularUser.login(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPasswordHash,
    } satisfies IRecipeSharingRegularUser.ILogin,
  });

  // 5. Regular user creates first ingredient
  const firstIngredientName = RandomGenerator.name(1);
  const firstIngredientBrand = RandomGenerator.name(1);
  const firstIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: {
          name: firstIngredientName,
          brand: firstIngredientBrand,
        } satisfies IRecipeSharingIngredient.ICreate,
      },
    );
  typia.assert(firstIngredient);

  // 6. Regular user creates second ingredient
  const secondIngredientName = RandomGenerator.name(1);
  const secondIngredientBrand = RandomGenerator.name(1);
  const secondIngredient: IRecipeSharingIngredient =
    await api.functional.recipeSharing.regularUser.ingredients.create(
      connection,
      {
        body: {
          name: secondIngredientName,
          brand: secondIngredientBrand,
        } satisfies IRecipeSharingIngredient.ICreate,
      },
    );
  typia.assert(secondIngredient);

  // 7. Switch authentication context back to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPasswordHash,
    } satisfies IRecipeSharingModerator.ILogin,
  });

  // 8. Moderator creates an initial substitution
  const initialConversionRatio = Math.floor(Math.random() * 10) + 1;
  const initialSubstitution: IRecipeSharingIngredientSubstitution =
    await api.functional.recipeSharing.moderator.ingredients.substitutions.createSubstitution(
      connection,
      {
        ingredientId: firstIngredient.id,
        body: {
          ingredient_id: firstIngredient.id,
          substitute_ingredient_id: secondIngredient.id,
          conversion_ratio: initialConversionRatio,
        } satisfies IRecipeSharingIngredientSubstitution.ICreate,
      },
    );
  typia.assert(initialSubstitution);

  // 9. Moderator updates the substitution
  const updatedConversionRatio = initialConversionRatio + 5;
  const updatedStatus = "approved" as const; // Must use exact enum value
  const updatedSubstitution: IRecipeSharingIngredientSubstitution =
    await api.functional.recipeSharing.moderator.ingredients.substitutions.updateSubstitution(
      connection,
      {
        ingredientId: firstIngredient.id,
        substitutionId: initialSubstitution.id,
        body: {
          conversion_ratio: updatedConversionRatio,
          status: updatedStatus,
        } satisfies IRecipeSharingIngredientSubstitution.IUpdate,
      },
    );
  typia.assert(updatedSubstitution);

  // 10. Validate updated substitution fields
  TestValidator.equals(
    "conversion ratio updated",
    updatedSubstitution.conversion_ratio,
    updatedConversionRatio,
  );
  TestValidator.equals(
    "status updated",
    updatedSubstitution.status,
    updatedStatus,
  );
  TestValidator.equals(
    "ingredient id unchanged",
    updatedSubstitution.ingredient_id,
    firstIngredient.id,
  );
  TestValidator.equals(
    "substitute ingredient id unchanged",
    updatedSubstitution.substitute_ingredient_id,
    secondIngredient.id,
  );
}
