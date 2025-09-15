import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingDietCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategory";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validates successful deletion of a diet category by an authenticated
 * moderator.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new moderator user via the moderator join API to establish
 *    authorized authentication context.
 * 2. Creates a new diet category using the authenticated moderator context.
 * 3. Deletes the newly created diet category by ID.
 * 4. Attempts to delete the same diet category again, expecting an error,
 *    verifying that deletion is permanent and no such category exists
 *    anymore.
 *
 * The test ensures authorization, proper resource creation, and enforcement
 * of deletion rules for diet categories. It validates all API responses
 * strictly with full type assertions.
 *
 * @param connection - The API connection object
 */
export async function test_api_diet_category_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator user and establish the authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(64); // Simulated hash

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a diet category with authorized moderator
  const dietCategoryCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRecipeSharingDietCategory.ICreate;

  const createdDietCategory: IRecipeSharingDietCategory =
    await api.functional.recipeSharing.moderator.dietCategories.create(
      connection,
      {
        body: dietCategoryCreateBody,
      },
    );
  typia.assert(createdDietCategory);

  // Step 3: Delete the created diet category
  await api.functional.recipeSharing.moderator.dietCategories.erase(
    connection,
    {
      id: createdDietCategory.id,
    },
  );

  // Step 4: Attempt to delete the same diet category again, expect error due to non-existence
  await TestValidator.error(
    "deleting non-existent diet category throws error",
    async () => {
      await api.functional.recipeSharing.moderator.dietCategories.erase(
        connection,
        {
          id: createdDietCategory.id,
        },
      );
    },
  );
}
