import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test updating an existing recipe collection by its ID as a regular user.
 *
 * This test performs a complete business workflow:
 *
 * 1. Creates a new regular user and authenticates.
 * 2. Creates a collection owned by this user.
 * 3. Updates the collection's name and description.
 * 4. Validates the update is correctly persisted.
 * 5. Tries to update a non-existent collection to verify error handling.
 * 6. Registers another user and attempts unauthorized update to verify
 *    security enforcement.
 *
 * All operations and assertions ensure strict type safety and business rule
 * compliance. Authentication token management is handled via SDK internal
 * mechanics. Error scenarios use awaited TestValidator.error with proper
 * async callbacks.
 */
export async function test_api_collection_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register main regular user
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // Step 2: Create a collection owned by the user
  const collectionCreateBody = {
    owner_user_id: user.id,
    name: RandomGenerator.name(),
    description: null,
  } satisfies IRecipeSharingCollections.ICreate;

  const collection: IRecipeSharingCollections =
    await api.functional.recipeSharing.regularUser.collections.create(
      connection,
      {
        body: collectionCreateBody,
      },
    );
  typia.assert(collection);

  TestValidator.equals(
    "created collection owner matches user",
    collection.owner_user_id,
    user.id,
  );

  // Step 3: Update the collection name and description
  const updateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRecipeSharingCollections.IUpdate;

  const updatedCollection: IRecipeSharingCollections =
    await api.functional.recipeSharing.regularUser.collections.updateCollection(
      connection,
      {
        collectionId: collection.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCollection);

  // Step 4: Validate that updated fields match
  TestValidator.equals(
    "updated collection name",
    updatedCollection.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated collection description",
    updatedCollection.description,
    updateBody.description,
  );

  // Ownership must stay the same
  TestValidator.equals(
    "collection owner unchanged",
    updatedCollection.owner_user_id,
    collection.owner_user_id,
  );

  // Step 5: Attempt update with non-existent collectionId, expect failure
  await TestValidator.error(
    "update non-existing collection should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.collections.updateCollection(
        connection,
        {
          collectionId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // Step 6: Register another user (unauthorized user)
  const otherUserCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const otherUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: otherUserCreateBody,
    });
  typia.assert(otherUser);

  // Step 7: Authenticate as unauthorized user to update auth context
  await api.functional.auth.regularUser.join(connection, {
    body: otherUserCreateBody,
  });

  await TestValidator.error(
    "unauthorized user cannot update another user's collection",
    async () => {
      await api.functional.recipeSharing.regularUser.collections.updateCollection(
        connection,
        {
          collectionId: collection.id,
          body: updateBody,
        },
      );
    },
  );
}
