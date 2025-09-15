import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";

/**
 * End-to-End test validating the successful creation of a recipe tag by a
 * regular user.
 *
 * Steps:
 *
 * 1. Register and authenticate a new regular user through POST
 *    /auth/regularUser/join with unique email, password hash, and
 *    username.
 * 2. Confirm successful user authorization with received user id and token.
 * 3. Create a new recipe tag via POST /recipeSharing/regularUser/tags with
 *    valid name and optional description.
 * 4. Assert response includes expected tag properties including id, name,
 *    created_at, updated_at, and description if provided.
 * 5. Validate all API responses using typia.assert ensuring strict type
 *    correctness.
 *
 * Business rules:
 *
 * - Email must be a valid email address.
 * - Password hash must be provided (simulate with random string).
 * - Username must be unique (simulate with random name).
 * - Tag name is required and descriptive.
 * - Tag description is optional.
 */
export async function test_api_recipe_tag_creation_regularuser_success(
  connection: api.IConnection,
) {
  // Join to create and authenticate a new regular user
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: userBody,
    },
  );
  typia.assert(authorizedUser);

  // Prepare tag creation request body
  const tagBody: IRecipeSharingTags.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingTags.ICreate;

  // Create the recipe tag
  const createdTag = await api.functional.recipeSharing.regularUser.tags.create(
    connection,
    {
      body: tagBody,
    },
  );
  typia.assert(createdTag);

  // Validate returned tag properties
  TestValidator.predicate(
    "tag id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTag.id,
    ),
  );
  TestValidator.equals("tag name matches input", createdTag.name, tagBody.name);
  if (tagBody.description !== null && tagBody.description !== undefined) {
    TestValidator.equals(
      "tag description matches input",
      createdTag.description,
      tagBody.description,
    );
  } else {
    TestValidator.equals(
      "tag description is null or undefined",
      createdTag.description,
      null,
    );
  }
  TestValidator.predicate(
    "tag created_at is ISO date time",
    typeof createdTag.created_at === "string" &&
      createdTag.created_at.length > 0,
  );
  TestValidator.predicate(
    "tag updated_at is ISO date time",
    typeof createdTag.updated_at === "string" &&
      createdTag.updated_at.length > 0,
  );
}
