import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";

/**
 * Validate retrieval of a recipe category configuration by its ID.
 *
 * This E2E test follows the business scenario that a moderator user is
 * created, logs in, and then fetches the recipe category configuration by a
 * valid UUID. It ensures moderator authentication context is correctly
 * established and that the API returns data matching
 * IRecipeSharingRecipeCategoriesConfig.
 *
 * 1. Create a moderator user with realistic random email, username, and
 *    password hash.
 * 2. Login as the newly created moderator user with the created credentials.
 * 3. Generate a valid UUID and request the recipe category configuration by
 *    this ID.
 * 4. Assert all responses strictly match the expected types and contents.
 * 5. Use typia.assert to validate all API responses for perfect type
 *    compliance.
 * 6. Confirm no permissions or authentication errors occur.
 */
export async function test_api_recipe_categories_config_at_success(
  connection: api.IConnection,
) {
  // Step 1: Create moderator user
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: createBody });
  typia.assert(moderator);

  // Step 2: Login moderator user
  const loginBody = {
    email: createBody.email,
    password_hash: createBody.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;
  const loggedInModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, { body: loginBody });
  typia.assert(loggedInModerator);

  // Step 3: Retrieve recipe category configuration by valid UUID
  const targetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fetchedCategoryConfig: IRecipeSharingRecipeCategoriesConfig =
    await api.functional.recipeSharing.moderator.recipeCategoriesConfig.atRecipeCategoriesConfig(
      connection,
      { id: targetId },
    );
  typia.assert(fetchedCategoryConfig);

  // Step 4: Validate the fetched data consistency
  TestValidator.predicate(
    "retrieved recipe category config has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      fetchedCategoryConfig.id,
    ),
  );
}
