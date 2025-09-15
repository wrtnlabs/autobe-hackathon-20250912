import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test creating a new recipe collection for a regular user.
 *
 * This test function covers the entire flow starting from user registration
 * via the 'join' API, then creating a new recipe collection for that
 * authenticated user, validating correct creation including ownership, and
 * finally testing business constraints such as uniqueness of collection
 * names.
 *
 * Steps:
 *
 * 1. Register a new regular user with unique email, username, and password
 *    hash.
 * 2. Using the authenticated user context, create a new recipe collection with
 *    a unique name and optional description.
 * 3. Assert that the created collection matches input data and owner_user_id
 *    corresponds to the newly created user.
 * 4. Attempt to create another collection with the same name for the same
 *    user, expecting a business logic error due to uniqueness constraint.
 *
 * Note:
 *
 * - All identifiers use UUID format.
 * - Dates are ISO 8601 strings.
 * - Password hash is a realistic hash string.
 * - Unique username and email are generated randomly for each test run.
 * - Validation is done using typia.assert on responses and TestValidator
 *   assertions for business rules.
 */
export async function test_api_collection_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const username = `user_${RandomGenerator.alphaNumeric(5)}`;
  const passwordHash = RandomGenerator.alphaNumeric(64); // realistic hash length

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email,
        username,
        password_hash: passwordHash,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new recipe collection with a unique name
  const collectionName = `collection_${RandomGenerator.alphaNumeric(8)}`;
  const collectionDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 10,
  });

  const collection: IRecipeSharingCollections =
    await api.functional.recipeSharing.regularUser.collections.create(
      connection,
      {
        body: {
          owner_user_id: user.id,
          name: collectionName,
          description: collectionDescription,
        } satisfies IRecipeSharingCollections.ICreate,
      },
    );
  typia.assert(collection);

  TestValidator.equals(
    "collection name matches input",
    collection.name,
    collectionName,
  );
  TestValidator.equals(
    "collection description matches input",
    collection.description,
    collectionDescription,
  );
  TestValidator.equals(
    "owner_user_id matches user id",
    collection.owner_user_id,
    user.id,
  );

  // 3. Attempt creating a collection with a duplicate name for the same owner
  await TestValidator.error(
    "duplicate collection name creation should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.collections.create(
        connection,
        {
          body: {
            owner_user_id: user.id,
            name: collectionName, // duplicate name
            description: "This is a duplicate collection name test.",
          } satisfies IRecipeSharingCollections.ICreate,
        },
      );
    },
  );
}
