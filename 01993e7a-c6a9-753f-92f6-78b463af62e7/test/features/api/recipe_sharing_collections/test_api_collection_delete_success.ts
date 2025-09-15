import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * E2E test for successful recipe-sharing collection deletion by an
 * authenticated regular user.
 *
 * This test validates the full lifecycle from user registration to collection
 * creation and finally permanent deletion. It ensures authorization context is
 * correctly established and that deletion respects collection ownership. No
 * response body is expected from the delete operation, consistent with API
 * design.
 *
 * Test steps:
 *
 * 1. Create regular user with unique email, password hash, and username.
 * 2. Use returned authorization token context to create a new collection.
 * 3. Assert collection details match input and returned data.
 * 4. Delete collection by ID, verifying no errors occur.
 */
export async function test_api_collection_delete_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user by joining with unique credentials
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(10),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new collection owned by the authenticated user
  const collectionCreateBody = {
    owner_user_id: authorizedUser.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 12,
    }),
  } satisfies IRecipeSharingCollections.ICreate;

  const createdCollection: IRecipeSharingCollections =
    await api.functional.recipeSharing.regularUser.collections.create(
      connection,
      {
        body: collectionCreateBody,
      },
    );
  typia.assert(createdCollection);

  // Validate that returned collection matches input and ownership
  TestValidator.equals(
    "collection owner ID matches user ID",
    createdCollection.owner_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "collection name matches input",
    createdCollection.name,
    collectionCreateBody.name,
  );
  TestValidator.equals(
    "collection description matches input",
    createdCollection.description ?? null,
    collectionCreateBody.description ?? null,
  );

  // 3. Delete the collection by its ID
  await api.functional.recipeSharing.regularUser.collections.eraseCollection(
    connection,
    {
      collectionId: createdCollection.id,
    },
  );

  // No response from delete API, success determined by no exceptions
}
