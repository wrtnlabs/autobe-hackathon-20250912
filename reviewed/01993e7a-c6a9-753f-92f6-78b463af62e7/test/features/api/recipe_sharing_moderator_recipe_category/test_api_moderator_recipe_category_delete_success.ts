import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test successful deletion of a recipe category by recipeCategoryId.
 *
 * This test performs the following steps:
 *
 * 1. Moderator user signs up using a valid email, username, and password hash.
 * 2. The authentication token obtained from joining is used automatically by
 *    the SDK for authorization.
 * 3. Deletes a recipe category by a generated valid UUID as `recipeCategoryId`
 *    parameter.
 * 4. Validates that the deletion executes without errors (void response).
 *
 * The test confirms that the endpoint is accessible with valid moderator
 * auth, and successfully deletes the specified recipe category, depicted by
 * a UUID.
 */
export async function test_api_moderator_recipe_category_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Moderator signs up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(64);

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password_hash: moderatorPasswordHash,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Prepare valid recipeCategoryId to delete (simulate existing ID)
  const recipeCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Delete the recipe category by ID
  await api.functional.recipeSharing.moderator.recipeCategories.erase(
    connection,
    {
      recipeCategoryId: recipeCategoryId,
    },
  );
}
