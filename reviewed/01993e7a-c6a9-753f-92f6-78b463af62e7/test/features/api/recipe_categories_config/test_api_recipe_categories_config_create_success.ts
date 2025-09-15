import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";

/**
 * Test creating a new recipe category configuration by a moderator user.
 *
 * This test verifies the full flow of moderator registration, login, and
 * creation of a new recipe category configuration. The moderator user is
 * created with a random but valid email and username, plus a password hash
 * string. After joining, the moderator logs in to establish authentication
 * context before proceeding.
 *
 * The creation request includes a unique code and name for the recipe
 * category configuration. The optional description field is tested with
 * null to confirm API behavior on nullable fields.
 *
 * Response validation asserts that returned fields include a valid UUID id,
 * exact code and name matching the request, optional nullable description,
 * and proper ISO 8601 timestamps for created_at and updated_at.
 *
 * This comprehensive test ensures the moderator's ability to create recipe
 * categories with correct data flow, authentication, and validation.
 */
export async function test_api_recipe_categories_config_create_success(
  connection: api.IConnection,
) {
  // 1. Moderator user joins the system
  const modEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const modPasswordHash = RandomGenerator.alphaNumeric(32);
  const modUsername = RandomGenerator.name(2);
  const modCreateBody = {
    email: modEmail,
    password_hash: modPasswordHash,
    username: modUsername,
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: modCreateBody,
    });
  typia.assert(moderator);

  // 2. Moderator logs in to obtain authentication token context
  const modLoginBody = {
    email: modEmail,
    password_hash: modPasswordHash,
  } satisfies IRecipeSharingModerator.ILogin;

  const loginResult: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: modLoginBody,
    });
  typia.assert(loginResult);

  // 3. Create recipe category configuration with unique code and name
  const categoryCode = RandomGenerator.alphaNumeric(12);
  const categoryName = RandomGenerator.name(3);
  const categoryDescription = null; // explicit null to test nullable

  const createBody = {
    code: categoryCode,
    name: categoryName,
    description: categoryDescription,
  } satisfies IRecipeSharingRecipeCategoriesConfig.ICreate;

  const response: IRecipeSharingRecipeCategoriesConfig =
    await api.functional.recipeSharing.moderator.recipeCategoriesConfig.createRecipeCategoriesConfig(
      connection,
      { body: createBody },
    );

  typia.assert(response);

  // Regex for validating UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "response id is valid uuid",
    uuidRegex.test(response.id),
  );

  // Validate that code, name, description match request
  TestValidator.equals(
    "response code matches request",
    response.code,
    categoryCode,
  );
  TestValidator.equals(
    "response name matches request",
    response.name,
    categoryName,
  );
  TestValidator.equals(
    "response description matches request",
    response.description,
    categoryDescription,
  );

  // Regex for validating ISO 8601 date-time format
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  // Validate created_at and updated_at are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "response created_at is iso8601",
    dateTimeRegex.test(response.created_at),
  );
  TestValidator.predicate(
    "response updated_at is iso8601",
    dateTimeRegex.test(response.updated_at),
  );
}
