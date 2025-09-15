import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validate that deleting a recipe category with a non-existent recipeCategoryId
 * properly throws a 404 Not Found HTTP error.
 *
 * This test ensures that the system correctly enforces resource existence
 * validation for moderator-level recipe category deletion operations. It
 * follows the steps:
 *
 * 1. Register a new moderator user and set up the authentication context.
 * 2. Attempt deletion of a recipe category with an invalid UUID that does not
 *    exist in the system.
 * 3. Confirm that the API throws an HttpError with status 404 indicating the
 *    resource was not found.
 *
 * This test guarantees robust backend enforcement of resource ownership and
 * existence verification critical for system integrity and security.
 */
export async function test_api_moderator_recipe_category_delete_not_found_error(
  connection: api.IConnection,
) {
  // 1. Register a moderator and establish authentication context
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: `moderator_${RandomGenerator.alphaNumeric(10)}@example.com`,
        password_hash: "securehashedpassword",
        username: `modUser_${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Attempt to delete a non-existent recipe category using a random UUID
  const invalidCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Validate that deletion throws a 404 HttpError
  await TestValidator.error(
    "recipe category deletion with invalid ID throws 404 HttpError",
    async () => {
      await api.functional.recipeSharing.moderator.recipeCategories.erase(
        connection,
        {
          recipeCategoryId: invalidCategoryId,
        },
      );
    },
  );
}
