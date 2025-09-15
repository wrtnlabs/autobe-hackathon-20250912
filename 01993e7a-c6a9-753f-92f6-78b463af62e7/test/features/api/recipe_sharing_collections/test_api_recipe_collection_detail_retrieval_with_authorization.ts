import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate detailed recipe collection retrieval with user authorization
 * enforcement.
 *
 * This test verifies that a regular user can register, create a recipe
 * collection, and retrieve it successfully. It also guarantees that another
 * regular user cannot retrieve collections they do not own.
 *
 * The test ensures authentication flows, ownership enforcement, and
 * detailed data correctness.
 *
 * Steps:
 *
 * 1. Register and authenticate user A.
 * 2. User A creates a recipe collection.
 * 3. User A retrieves details of the created collection and validates the
 *    response.
 * 4. Register and authenticate user B.
 * 5. User B attempts unauthorized access to user A's collection, expecting
 *    failure.
 *
 * This test strictly follows the DTO and API specs with no type errors or
 * unauthorized property usage.
 */
export async function test_api_recipe_collection_detail_retrieval_with_authorization(
  connection: api.IConnection,
) {
  // 1. User A registration and authentication
  const userBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const userA: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: userBodyA });
  typia.assert(userA);

  // 2. User A creates a recipe collection
  const createBody = {
    owner_user_id: userA.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRecipeSharingCollections.ICreate;

  const collection: IRecipeSharingCollections =
    await api.functional.recipeSharing.regularUser.collections.create(
      connection,
      { body: createBody },
    );
  typia.assert(collection);

  TestValidator.equals(
    "collection owner user id equals userA id",
    collection.owner_user_id,
    userA.id,
  );

  // 3. User A retrieves the collection details
  const collectionDetails: IRecipeSharingCollections =
    await api.functional.recipeSharing.regularUser.collections.at(connection, {
      collectionId: collection.id,
    });
  typia.assert(collectionDetails);

  TestValidator.equals(
    "collectionDetails id equals collection id",
    collectionDetails.id,
    collection.id,
  );
  TestValidator.equals(
    "collectionDetails owner user id equals userA id",
    collectionDetails.owner_user_id,
    userA.id,
  );

  // 4. User B registration and authentication
  const userBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const userB: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: userBodyB });
  typia.assert(userB);

  // 5. User B tries to retrieve user A's collection details, expecting authorization error
  await TestValidator.error(
    "User B cannot access User A's collection details",
    async () => {
      await api.functional.recipeSharing.regularUser.collections.at(
        connection,
        {
          collectionId: collection.id,
        },
      );
    },
  );
}
