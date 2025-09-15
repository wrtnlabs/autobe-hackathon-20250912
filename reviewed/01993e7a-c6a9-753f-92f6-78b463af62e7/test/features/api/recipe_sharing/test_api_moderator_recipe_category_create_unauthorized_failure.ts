import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Validate creation failure due to unauthorized access without moderator
 * authentication.
 *
 * This test ensures that the creation of a new recipe category fails when
 * the API call is made without proper moderator authentication. It first
 * performs the moderator join operation to establish user context, then
 * attempts to create a category using a fresh connection without
 * authorization headers.
 *
 * The test asserts that the creation API call throws an unauthorized error,
 * validating the security enforcement on this moderator-only endpoint.
 *
 * Steps:
 *
 * 1. Moderator joins the system to authenticate.
 * 2. Using a fresh connection without authorization header, attempts to create
 *    a recipe category.
 * 3. Validates that the API request fails with unauthorized error.
 *
 * This test ensures only authenticated moderators can create recipe
 * categories.
 */
export async function test_api_moderator_recipe_category_create_unauthorized_failure(
  connection: api.IConnection,
) {
  // First, perform the moderator join to establish user context for the moderator role
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // Create a fresh connection without authorization header to simulate unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Prepare request body for creating a recipe category
  const requestBody = {
    category_type: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 8,
    }),
    name: RandomGenerator.name(),
    description:
      Math.random() < 0.5
        ? null
        : RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  } satisfies IRecipeSharingRecipeCategory.ICreate;

  // Expect the creation to fail due to unauthorized access
  await TestValidator.error("unauthorized creation should fail", async () => {
    await api.functional.recipeSharing.moderator.recipeCategories.create(
      unauthConn,
      {
        body: requestBody,
      },
    );
  });
}
