import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipeCategoriesConfig";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";

/**
 * This E2E test validates the complete flow for a moderator user to
 * retrieve recipe category configurations with pagination and filtering.
 *
 * The test performs:
 *
 * 1. Moderator user registration by calling /auth/moderator/join with a valid
 *    moderator create DTO.
 * 2. Moderator user login by calling /auth/moderator/login with the same
 *    credentials.
 * 3. Calls PATCH /recipeSharing/moderator/recipeCategoriesConfig with a
 *    pagination request, using the logged-in moderator authorization
 *    context.
 * 4. Checks that the response contains valid pagination info with current
 *    page, limit, total records, and pages count.
 * 5. Checks that the response data array contains recipe category
 *    configuration summaries with id, code, and name properties.
 * 6. Validates the types of the response data using typia.assert.
 */
export async function test_api_recipe_categories_config_index_success(
  connection: api.IConnection,
) {
  // 1. Create new moderator user
  const moderatorCreate: IRecipeSharingModerator.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(),
  };
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // 2. Login moderator user
  const moderatorLogin: IRecipeSharingModerator.ILogin = {
    email: moderatorCreate.email,
    password_hash: moderatorCreate.password_hash,
  };
  const moderatorLoggedIn: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLogin,
    });
  typia.assert(moderatorLoggedIn);

  // 3. Call recipe categories config index API with pagination request
  const requestBody: IRecipeSharingRecipeCategoriesConfig.IRequest = {
    page: 1,
    limit: 10,
    sort: "name",
    direction: "asc",
  };
  const response: IPageIRecipeSharingRecipeCategoriesConfig.ISummary =
    await api.functional.recipeSharing.moderator.recipeCategoriesConfig.indexRecipeCategoriesConfig(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);

  // 4. Assert pagination object
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );

  // 5. Assert data array elements
  TestValidator.predicate("data array is array", Array.isArray(response.data));
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.predicate("item has id", typeof item.id === "string");
    TestValidator.predicate("item has code", typeof item.code === "string");
    TestValidator.predicate("item has name", typeof item.name === "string");
  }
}
