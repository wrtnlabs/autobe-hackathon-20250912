import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";

export async function test_api_recipe_categories_config_update_success(
  connection: api.IConnection,
) {
  // 1. Create a new moderator user by calling auth moderator join endpoint
  const moderatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Login the moderator user to authenticate
  const moderatorLoginBody = {
    email: moderator.email,
    password_hash: moderatorCreateBody.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;

  const loginResponse: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(loginResponse);

  // 3. Update existing recipe category configuration by ID
  // Use the ID from random but valid UUID for testing
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Prepare update body with valid values
  const updateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRecipeSharingRecipeCategoriesConfig.IUpdate;

  // Call the update API
  const updatedCategory: IRecipeSharingRecipeCategoriesConfig =
    await api.functional.recipeSharing.moderator.recipeCategoriesConfig.updateRecipeCategoryConfig(
      connection,
      {
        id: categoryId,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // Validate updated response fields match inputs
  TestValidator.equals(
    "recipe category id matches input",
    updatedCategory.id,
    categoryId,
  );
  TestValidator.equals(
    "recipe category code updated",
    updatedCategory.code,
    updateBody.code,
  );
  TestValidator.equals(
    "recipe category name updated",
    updatedCategory.name,
    updateBody.name,
  );
  if (updateBody.description !== null && updateBody.description !== undefined) {
    TestValidator.equals(
      "recipe category description updated",
      updatedCategory.description,
      updateBody.description,
    );
  } else {
    TestValidator.predicate(
      "recipe category description is null or undefined",
      updatedCategory.description === null ||
        updatedCategory.description === undefined,
    );
  }

  // Validate timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "recipe category created_at is ISO date string",
    typeof updatedCategory.created_at === "string" &&
      !Number.isNaN(Date.parse(updatedCategory.created_at)),
  );
  TestValidator.predicate(
    "recipe category updated_at is ISO date string",
    typeof updatedCategory.updated_at === "string" &&
      !Number.isNaN(Date.parse(updatedCategory.updated_at)),
  );

  // Additional update with null description to test nullable handling
  const nullDescriptionUpdateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(1),
    description: null,
  } satisfies IRecipeSharingRecipeCategoriesConfig.IUpdate;

  const updatedCategoryNullDesc =
    await api.functional.recipeSharing.moderator.recipeCategoriesConfig.updateRecipeCategoryConfig(
      connection,
      {
        id: categoryId,
        body: nullDescriptionUpdateBody,
      },
    );
  typia.assert(updatedCategoryNullDesc);

  TestValidator.equals(
    "recipe category id matches input (null desc update)",
    updatedCategoryNullDesc.id,
    categoryId,
  );
  TestValidator.equals(
    "recipe category code updated (null desc update)",
    updatedCategoryNullDesc.code,
    nullDescriptionUpdateBody.code,
  );
  TestValidator.equals(
    "recipe category name updated (null desc update)",
    updatedCategoryNullDesc.name,
    nullDescriptionUpdateBody.name,
  );

  TestValidator.predicate(
    "recipe category description is null when set to null",
    updatedCategoryNullDesc.description === null,
  );

  TestValidator.predicate(
    "recipe category created_at is ISO date string (null desc update)",
    typeof updatedCategoryNullDesc.created_at === "string" &&
      !Number.isNaN(Date.parse(updatedCategoryNullDesc.created_at)),
  );
  TestValidator.predicate(
    "recipe category updated_at is ISO date string (null desc update)",
    typeof updatedCategoryNullDesc.updated_at === "string" &&
      !Number.isNaN(Date.parse(updatedCategoryNullDesc.updated_at)),
  );
}
