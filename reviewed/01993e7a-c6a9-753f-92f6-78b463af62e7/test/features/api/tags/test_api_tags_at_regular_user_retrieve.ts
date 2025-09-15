import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";

/**
 * This test validates the retrieval of a recipe tag details by tagId by a
 * regular user.
 *
 * It covers the following process:
 *
 * 1. Create and authenticate a new regular user for authorization.
 * 2. Create a recipe tag using the authorized context.
 * 3. Retrieve the created tag by its ID and verify all details.
 * 4. Attempt to retrieve a tag with a non-existent UUID to confirm proper error
 *    handling.
 *
 * This ensures that the tag retrieval endpoint functions correctly for
 * authorized users and handles error cases gracefully.
 */
export async function test_api_tags_at_regular_user_retrieve(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new regular user
  const newUserData = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: newUserData,
    });
  typia.assert(authorizedUser);

  // Step 2: Create a new recipe tag under this authorized user context
  const newTagData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })
      .replace(/\s+/g, " ")
      .trim(),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies IRecipeSharingTags.ICreate;

  const createdTag: IRecipeSharingTags =
    await api.functional.recipeSharing.regularUser.tags.create(connection, {
      body: newTagData,
    });
  typia.assert(createdTag);

  // Step 3: Retrieve the created tag by ID
  const retrievedTag: IRecipeSharingTags =
    await api.functional.recipeSharing.regularUser.tags.at(connection, {
      tagId: createdTag.id,
    });
  typia.assert(retrievedTag);

  // Verify retrieved tag matches created tag
  TestValidator.equals(
    "retrieved tag id matches",
    retrievedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "retrieved tag name matches",
    retrievedTag.name,
    createdTag.name,
  );
  TestValidator.equals(
    "retrieved tag description matches",
    retrievedTag.description,
    createdTag.description,
  );

  // Step 4: Test retrieval of non-existent tagId - expect error
  await TestValidator.error(
    "retrieve non-existent tag id should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.tags.at(connection, {
        tagId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
