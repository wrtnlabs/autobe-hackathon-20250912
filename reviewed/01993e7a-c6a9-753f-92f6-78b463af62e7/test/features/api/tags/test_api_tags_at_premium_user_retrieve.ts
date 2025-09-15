import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";

/**
 * This E2E test validates that a premium user can retrieve detailed information
 * of a recipe tag by ID.
 *
 * It first authenticates a new premium user, then creates a recipe tag, and
 * finally retrieves the tag by its ID to verify all properties. It also tests
 * error handling for retrieving non-existent tags and for unauthorized access
 * without authentication.
 */
export async function test_api_tags_at_premium_user_retrieve(
  connection: api.IConnection,
) {
  // Step 1: Premium user sign-up and authentication
  const premiumUserBody = {
    email: `user_${RandomGenerator.alphaNumeric(8).toLowerCase()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserBody,
    });
  typia.assert(premiumUser);

  // Step 2: Create a recipe tag
  const tagCreateBody = {
    name: `Tag_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRecipeSharingTags.ICreate;

  const createdTag: IRecipeSharingTags =
    await api.functional.recipeSharing.premiumUser.tags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert(createdTag);

  TestValidator.predicate(
    "created tag id format is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      createdTag.id,
    ),
  );

  TestValidator.equals(
    "created tag name matches request",
    createdTag.name,
    tagCreateBody.name,
  );
  if (createdTag.description === null || createdTag.description === undefined) {
    TestValidator.predicate(
      "created tag description is null or undefined (optional)",
      createdTag.description === null || createdTag.description === undefined,
    );
  } else {
    TestValidator.predicate(
      "created tag description matches request",
      createdTag.description === tagCreateBody.description,
    );
  }

  // Step 3: Retrieve the created tag by ID
  const retrievedTag: IRecipeSharingTags =
    await api.functional.recipeSharing.premiumUser.tags.at(connection, {
      tagId: createdTag.id,
    });
  typia.assert(retrievedTag);

  TestValidator.equals(
    "retrieved tag id matches created tag id",
    retrievedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "retrieved tag name matches created tag name",
    retrievedTag.name,
    createdTag.name,
  );

  if (
    retrievedTag.description === null ||
    retrievedTag.description === undefined
  ) {
    TestValidator.predicate(
      "retrieved tag description is null or undefined",
      retrievedTag.description === null ||
        retrievedTag.description === undefined,
    );
  } else {
    TestValidator.equals(
      "retrieved tag description matches",
      retrievedTag.description,
      createdTag.description,
    );
  }

  TestValidator.predicate(
    "retrieved tag created_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedTag.created_at,
    ),
  );

  TestValidator.predicate(
    "retrieved tag updated_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedTag.updated_at,
    ),
  );

  // Step 4: Error test for retrieving non-existent tag (random UUID)
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent tag throws error",
    async () => {
      await api.functional.recipeSharing.premiumUser.tags.at(connection, {
        tagId: nonExistentUUID,
      });
    },
  );

  // Step 5: Error test for unauthorized retrieval (connection without auth)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "retrieving tag without authentication throws error",
    async () => {
      await api.functional.recipeSharing.premiumUser.tags.at(
        unauthenticatedConnection,
        {
          tagId: createdTag.id,
        },
      );
    },
  );
}
