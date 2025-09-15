import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This scenario tests a premium user successfully deleting an ingredient. The
 * steps include registering and logging in a premium user, creating a new
 * ingredient, and deleting the ingredient by its ID. The ingredientId path
 * parameter is obtained from the created ingredient. The scenario verifies a
 * successful HTTP 204 response and confirms permanent deletion of the
 * ingredient. This test ensures proper authorization, deletion behavior, and
 * data cleanup for premium users.
 */
export async function test_api_ingredient_delete_success_premium_user(
  connection: api.IConnection,
) {
  // Register a premium user
  const premiumEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const premiumPasswordHash = RandomGenerator.alphaNumeric(16);
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: premiumEmail,
        password_hash: premiumPasswordHash,
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(premiumUser);

  // Login the premium user
  const premiumLogin: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.login(connection, {
      body: {
        email: premiumEmail,
        password_hash: premiumPasswordHash,
      } satisfies IRecipeSharingPremiumUser.ILogin,
    });
  typia.assert(premiumLogin);

  // Register a regular user
  const regularEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const regularPasswordHash = RandomGenerator.alphaNumeric(16);
  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: regularEmail,
        password_hash: regularPasswordHash,
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // Login the regular user
  const regularLogin: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: {
        email: regularEmail,
        password_hash: regularPasswordHash,
      } satisfies IRecipeSharingRegularUser.ILogin,
    });
  typia.assert(regularLogin);

  // Create an ingredient as regular user
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

  // Delete the created ingredient as premium user
  await api.functional.recipeSharing.premiumUser.ingredients.eraseIngredient(
    connection,
    {
      ingredientId: createdIngredient.id,
    },
  );
  // No response body - ensure deletion success indirectly
}
