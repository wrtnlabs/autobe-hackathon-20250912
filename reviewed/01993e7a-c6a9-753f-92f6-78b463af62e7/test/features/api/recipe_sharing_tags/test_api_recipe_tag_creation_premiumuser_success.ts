import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";

/**
 * Test the successful creation of a new recipe tag by a premium user.
 *
 * This test covers the complete scenario where a premium user account is
 * created via authentication join, followed by creation of a recipe tag
 * with valid name and optional description. It also validates the created
 * tag details are correct and respects schema formats. Furthermore, it
 * attempts tag creation without proper authentication to ensure
 * unauthorized access is rejected.
 *
 * Test Steps:
 *
 * 1. Create a premium user account by calling the join API.
 * 2. Use the authenticated connection to create a new tag with a valid name
 *    and optional description.
 * 3. Validate the returned tag data matches the input and follows all DTO
 *    constraints, including UUID format and date-time formats.
 * 4. Attempt to create a tag without authentication to confirm failure.
 */
export async function test_api_recipe_tag_creation_premiumuser_success(
  connection: api.IConnection,
) {
  // 1. Premium user creation & authentication
  const userCreateBody = {
    email: `user${Date.now()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(60),
    username: RandomGenerator.name(2).replace(/\s+/g, "_"),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const authorizedUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new recipe tag with valid name and description
  const newTagBody = {
    name: `tag_${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingTags.ICreate;

  const createdTag: IRecipeSharingTags =
    await api.functional.recipeSharing.premiumUser.tags.create(connection, {
      body: newTagBody,
    });
  typia.assert(createdTag);

  // Verify returned tag properties
  TestValidator.equals("tag name matches", createdTag.name, newTagBody.name);
  TestValidator.equals(
    "tag description matches",
    createdTag.description === undefined ? null : createdTag.description,
    newTagBody.description === undefined ? null : newTagBody.description,
  );
  TestValidator.predicate(
    "tag id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTag.id,
    ),
  );

  // Validate created_at and updated_at timestamps are ISO strings
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z?$/.test(
      createdTag.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z?$/.test(
      createdTag.updated_at,
    ),
  );

  // 3. Attempt to create tag without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized tag creation fails", async () => {
    await api.functional.recipeSharing.premiumUser.tags.create(
      unauthenticatedConnection,
      {
        body: newTagBody,
      },
    );
  });
}
