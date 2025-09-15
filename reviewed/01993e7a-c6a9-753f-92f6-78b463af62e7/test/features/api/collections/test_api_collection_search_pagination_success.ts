import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingCollections";
import type { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test the successful retrieval of user recipe collections using filtering and
 * pagination.
 *
 * Steps:
 *
 * 1. Create a new regular user and authenticate.
 * 2. Create multiple recipe collections owned by this user.
 * 3. Retrieve collections with pagination and sorting via PATCH endpoint.
 * 4. Validate all pagination details and that returned collections belong to the
 *    user.
 * 5. Test edge conditions including empty collections for users without any.
 * 6. Check pagination boundary by retrieving the second page and verifying no
 *    overlap.
 */
export async function test_api_collection_search_pagination_success(
  connection: api.IConnection,
) {
  // 1. Regular user registration and authentication (join)
  const userCreateBody1 = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user1: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody1,
    });
  typia.assert(user1);

  // 2. Create multiple recipe collections for the user
  const collectionCount = 5;
  const createdCollections: IRecipeSharingCollections[] = [];
  await ArrayUtil.asyncForEach(
    new Array(collectionCount).fill(null),
    async () => {
      const collectionBody = {
        owner_user_id: user1.id,
        name: `Collection ${RandomGenerator.paragraph({ sentences: 2 })}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRecipeSharingCollections.ICreate;

      const collection: IRecipeSharingCollections =
        await api.functional.recipeSharing.regularUser.collections.create(
          connection,
          { body: collectionBody },
        );
      typia.assert(collection);
      createdCollections.push(collection);
    },
  );

  // 3. Retrieve collection list via PATCH with filtering, pagination, sorting
  const requestBody = {
    owner_user_id: user1.id,
    page: 1,
    limit: 3,
    sort: "created_at desc",
  } satisfies IRecipeSharingCollections.IRequest;

  const page1: IPageIRecipeSharingCollections.ISummary =
    await api.functional.recipeSharing.regularUser.collections.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page1);

  // 4. Validate pagination structure and contents
  TestValidator.predicate(
    "pagination current page should be 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 3",
    page1.pagination.limit === 3,
  );
  TestValidator.predicate(
    "pagination total records should be at least created count",
    page1.pagination.records >= createdCollections.length,
  );

  // 5. Validate returned data Ids belong to created collection Ids
  const returnedIds = page1.data.map((col) => col.id);
  const createdIds = createdCollections.map((col) => col.id);
  const allMatch = returnedIds.every((id) => createdIds.includes(id));
  TestValidator.predicate(
    "all returned collections exist in created collections",
    allMatch,
  );

  // 6. Validate sorting order by created_at descending
  for (let i = 1; i < page1.data.length; i++) {
    const prev = new Date(page1.data[i - 1].created_at);
    const curr = new Date(page1.data[i].created_at);
    TestValidator.predicate(
      `collection ${i - 1} created_at >= collection ${i} created_at`,
      prev >= curr,
    );
  }

  // 7. Test retrieval of empty collections for a new user
  const userCreateBody2 = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user2: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody2,
    });
  typia.assert(user2);

  const emptyRequestBody = {
    owner_user_id: user2.id,
    page: 1,
    limit: 2,
    sort: "created_at desc",
  } satisfies IRecipeSharingCollections.IRequest;

  const emptyPage: IPageIRecipeSharingCollections.ISummary =
    await api.functional.recipeSharing.regularUser.collections.index(
      connection,
      { body: emptyRequestBody },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "empty collections for new user should have 0 records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty data array should be empty",
    emptyPage.data.length,
    0,
  );

  // 8. Test pagination boundaries: second page
  if (page1.pagination.pages > 1) {
    const page2Request = {
      owner_user_id: user1.id,
      page: 2,
      limit: 3,
      sort: "created_at desc",
    } satisfies IRecipeSharingCollections.IRequest;

    const page2Result: IPageIRecipeSharingCollections.ISummary =
      await api.functional.recipeSharing.regularUser.collections.index(
        connection,
        { body: page2Request },
      );
    typia.assert(page2Result);

    TestValidator.predicate(
      "page 2 current number should be 2",
      page2Result.pagination.current === 2,
    );

    // Validate that page2 data do not overlap with page1 data
    const page2Ids = page2Result.data.map((col) => col.id);
    const overlap = page2Ids.some((id) => returnedIds.includes(id));
    TestValidator.predicate(
      "page 2 data should not overlap with page 1 data",
      !overlap,
    );
  }
}
