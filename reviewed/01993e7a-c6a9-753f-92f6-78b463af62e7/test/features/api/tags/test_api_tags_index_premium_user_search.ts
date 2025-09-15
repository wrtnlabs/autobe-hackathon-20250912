import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingTags";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";

/**
 * Tests the search and retrieval of recipe tags as a premium user.
 *
 * This scenario performs these steps:
 *
 * 1. Creates and authenticates a new premium user account via
 *    `/auth/premiumUser/join`.
 * 2. Uses the authenticated context to perform a PATCH search on
 *    `/recipeSharing/premiumUser/tags`.
 * 3. Verifies the response pagination data and tag list correctness.
 * 4. Tests the search endpoint with various pagination and filtering
 *    parameters.
 * 5. Verifies unauthorized access is rejected when the auth token is missing.
 *
 * The test ensures strict compliance with authorization requirements,
 * proper pagination structure, and robust search functionality. Type
 * assertions with typia.assert guarantee response type validation.
 */
export async function test_api_tags_index_premium_user_search(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new premium user
  const createBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: createBody,
    });
  typia.assert(premiumUser);

  // Step 2: Test retrieval of tags with empty filter and default pagination
  const emptySearchBody = {} satisfies IRecipeSharingTags.IRequest;
  const page1: IPageIRecipeSharingTags.ISummary =
    await api.functional.recipeSharing.premiumUser.tags.index(connection, {
      body: emptySearchBody,
    });
  typia.assert(page1);

  TestValidator.predicate(
    "pagination current page should be >= 0",
    page1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    page1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    page1.pagination.pages >= 0,
  );

  // Step 3: Test retrieval of tags with name filter
  const tagNameFilter = RandomGenerator.substring(
    page1.data.length > 0 ? page1.data[0].name : "",
  );
  const searchByNameBody = {
    name: tagNameFilter === "" ? undefined : tagNameFilter,
    page: 1,
    limit: 10,
    sort: "+name",
  } satisfies IRecipeSharingTags.IRequest;
  const page2: IPageIRecipeSharingTags.ISummary =
    await api.functional.recipeSharing.premiumUser.tags.index(connection, {
      body: searchByNameBody,
    });
  typia.assert(page2);

  page2.data.forEach((tag) => {
    typia.assert(tag);
    TestValidator.predicate(
      "tag name contains filter",
      tag.name.includes(tagNameFilter),
    );
  });

  // Step 4: Test pagination boundaries
  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
    { page: Math.max(1, page1.pagination.pages), limit: 10 },
  ];

  for (const testParams of paginationTests) {
    const paginatedBody = {
      page: testParams.page,
      limit: testParams.limit,
    } satisfies IRecipeSharingTags.IRequest;

    const resultPage: IPageIRecipeSharingTags.ISummary =
      await api.functional.recipeSharing.premiumUser.tags.index(connection, {
        body: paginatedBody,
      });
    typia.assert(resultPage);
    TestValidator.predicate(
      `pagination current should be ${testParams.page}`,
      resultPage.pagination.current === testParams.page,
    );
    TestValidator.predicate(
      `pagination limit should be ${testParams.limit}`,
      resultPage.pagination.limit === testParams.limit,
    );
  }

  // Step 5: Test unauthorized request fails - using unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.recipeSharing.premiumUser.tags.index(
      unauthenticatedConnection,
      { body: emptySearchBody },
    );
  });
}
