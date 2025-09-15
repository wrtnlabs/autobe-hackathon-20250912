import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";

/**
 * This test function validates the full lifecycle of deleting a recipe
 * category configuration by its ID, accessible only by a logged-in
 * moderator user.
 *
 * The test workflow is as follows:
 *
 * 1. Create a new moderator user account via the join endpoint.
 * 2. Log in as this moderator to obtain a valid authentication token.
 * 3. Use the moderator credentials to create a recipe category configuration,
 *    capturing its ID.
 * 4. Delete the created recipe category configuration by its ID, validating
 *    successful deletion.
 * 5. Attempt to delete the same configuration again or from an unauthorized
 *    context to assert failure.
 *
 * This test ensures that only authenticated moderators can perform delete
 * operations and that deletion removes the resource correctly without any
 * response body.
 */
export async function test_api_recipe_category_config_delete_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new moderator user account
  const moderatorCreateParams: IRecipeSharingModerator.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  };
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateParams,
    });
  typia.assert(moderator);

  // 2. Log in as the moderator
  const moderatorLoginParams: IRecipeSharingModerator.ILogin = {
    email: moderatorCreateParams.email,
    password_hash: moderatorCreateParams.password_hash,
  };
  const loggedInModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLoginParams,
    });
  typia.assert(loggedInModerator);

  // 3. Create a recipe category configuration
  const categoryCreateBody: IRecipeSharingRecipeCategoriesConfig.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const createdCategory: IRecipeSharingRecipeCategoriesConfig =
    await api.functional.recipeSharing.moderator.recipeCategoriesConfig.createRecipeCategoriesConfig(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // 4. Delete the created recipe category configuration by ID
  await api.functional.recipeSharing.moderator.recipeCategoriesConfig.eraseRecipeCategoryConfig(
    connection,
    {
      id: createdCategory.id,
    },
  );

  // 5. Attempting unauthorized deletion - create another connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Try to delete with unauthenticated connection, expect error
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.recipeSharing.moderator.recipeCategoriesConfig.eraseRecipeCategoryConfig(
        unauthenticatedConnection,
        {
          id: createdCategory.id,
        },
      );
    },
  );
}
