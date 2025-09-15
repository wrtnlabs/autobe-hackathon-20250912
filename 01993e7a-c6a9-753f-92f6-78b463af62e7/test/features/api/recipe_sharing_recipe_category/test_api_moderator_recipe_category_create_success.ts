import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * End-to-end test function to verify that a moderator can successfully create a
 * new recipe category.
 *
 * The test covers the complete workflow:
 *
 * 1. Moderator joins the system with valid credentials to obtain authentication.
 * 2. Using the authenticated context, the moderator creates a new recipe category.
 * 3. Validates that the recipe category is correctly created and contains all
 *    required properties.
 *
 * This test ensures compliance with API contract and business logic for recipe
 * category creation.
 */
export async function test_api_moderator_recipe_category_create_success(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins the system
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32); // Random hash-like string
  const moderatorUsername = RandomGenerator.name(1); // Single word username

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a new recipe category
  const createBody = {
    category_type: RandomGenerator.pick([
      "cuisine",
      "diet",
      "difficulty",
    ] as const),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: null,
  } satisfies IRecipeSharingRecipeCategory.ICreate;

  const category: IRecipeSharingRecipeCategory =
    await api.functional.recipeSharing.moderator.recipeCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert(category);

  // Step 3: Validate returned recipe category properties
  TestValidator.predicate(
    "category id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
  TestValidator.equals(
    "category category_type matches input",
    category.category_type,
    createBody.category_type,
  );
  TestValidator.equals(
    "category name matches input",
    category.name,
    createBody.name,
  );
  // description property is nullable string, so accept null or string
  TestValidator.predicate(
    "category description is null or string",
    category.description === null || typeof category.description === "string",
  );
  // Validate ISO 8601 format for created_at and updated_at
  TestValidator.predicate(
    "category created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(category.created_at),
  );
  TestValidator.predicate(
    "category updated_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(category.updated_at),
  );
}
