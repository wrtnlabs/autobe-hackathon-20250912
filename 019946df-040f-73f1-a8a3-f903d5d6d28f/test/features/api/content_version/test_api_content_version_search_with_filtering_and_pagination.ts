import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentVersion";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentVersion";

/**
 * Test the content version search functionality under systemAdmin
 * authorization.
 *
 * The test begins by creating and authenticating a systemAdmin user using the
 * /auth/systemAdmin/join and /auth/systemAdmin/login endpoints. It then uses a
 * randomly generated UUID as a contentId to test the search endpoint. Various
 * pagination and search filters are applied in multiple requests to validate
 * the filtering and paging behavior.
 *
 * The test verifies that all returned content versions belong to the requested
 * contentId, that pagination metadata aligns with response data, and that the
 * API honors authorization requirements, responding with errors for invalid or
 * unauthorized requests.
 *
 * Error scenarios are tested for invalid contentIds, unauthorized access (such
 * as missing or invalid tokens), and empty result sets.
 *
 * This comprehensive test ensures robust access control, filtering, pagination,
 * and schema conformity of the enterpriseLms systemAdmin content version search
 * API.
 */
export async function test_api_content_version_search_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create systemAdmin user via join API
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32), // random hash
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Login to ensure token refresh
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // Use a valid UUID as contentId for testing
  const contentId = typia.random<string & tags.Format<"uuid">>();

  // Function to test the content versions index with given request body
  async function callContentVersions(
    requestBody: IEnterpriseLmsContentVersion.IRequest,
  ) {
    const response: IPageIEnterpriseLmsContentVersion.ISummary =
      await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
        connection,
        {
          contentId,
          body: requestBody,
        },
      );
    typia.assert(response);
    return response;
  }

  // Test: Request first page, default limit
  const firstPageRequest = {
    page: 1,
    limit: 10,
    search: null,
    sort: null,
  } satisfies IEnterpriseLmsContentVersion.IRequest;

  const firstPage = await callContentVersions(firstPageRequest);
  // Validate contentId in all content versions
  for (const version of firstPage.data) {
    TestValidator.equals(
      "content version contentId matches",
      version.content_id,
      contentId,
    );
  }
  // Pagination metadata logical check
  TestValidator.predicate(
    "pagination current is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    firstPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 1",
    firstPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination pages consistent with records and limit",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );

  // Test: Request second page, if pages > 1
  if (firstPage.pagination.pages > 1) {
    const secondPageRequest = {
      ...firstPageRequest,
      page: 2,
    } satisfies IEnterpriseLmsContentVersion.IRequest;

    const secondPage = await callContentVersions(secondPageRequest);

    // Validate contentId in all content versions (page 2)
    for (const version of secondPage.data) {
      TestValidator.equals(
        "content version contentId matches on page 2",
        version.content_id,
        contentId,
      );
    }

    // Pagination current property
    TestValidator.equals(
      "pagination current page 2",
      secondPage.pagination.current,
      2,
    );
    // Pagination limit unchanged
    TestValidator.equals(
      "pagination limit unchanged page 2",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
  }

  // Test: Request with search keyword filter (use first item's title if exists)
  if (firstPage.data.length > 0) {
    const searchKeyword = firstPage.data[0].title.substring(0, 3); // partial title
    const searchRequest = {
      ...firstPageRequest,
      search: searchKeyword,
    } satisfies IEnterpriseLmsContentVersion.IRequest;

    const searchResult = await callContentVersions(searchRequest);

    // All returned versions should have contentId matching
    for (const version of searchResult.data) {
      TestValidator.equals(
        "content ID matches in search results",
        version.content_id,
        contentId,
      );
      // Title should contain search keyword (case-insensitive)
      TestValidator.predicate(
        "title contains search keyword",
        version.title.toLowerCase().includes(searchKeyword.toLowerCase()),
      );
    }
  }

  // Test: Request with limit exceeding typical maximum, expect limit honored or max capped
  const highLimitRequest = {
    ...firstPageRequest,
    limit: 1000,
  } satisfies IEnterpriseLmsContentVersion.IRequest;

  const highLimitResponse = await callContentVersions(highLimitRequest);
  // The limit in response should be equal or less than requested 1000
  TestValidator.predicate(
    "pagination limit honored or capped",
    highLimitResponse.pagination.limit <= 1000 &&
      highLimitResponse.pagination.limit > 0,
  );

  // Test error on invalid contentId
  await TestValidator.error("error on invalid contentId format", async () => {
    await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
      connection,
      {
        contentId: "invalid-uuid",
        body: firstPageRequest,
      },
    );
  });

  // Test error on unauthorized access (simulate by clearing headers)
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {}, // remove authorization header
  };
  await TestValidator.error("error on unauthorized access", async () => {
    await api.functional.enterpriseLms.systemAdmin.contents.contentVersions.index(
      unauthorizedConnection,
      {
        contentId,
        body: firstPageRequest,
      },
    );
  });

  // Test empty results by searching nonsense
  const emptySearchRequest = {
    ...firstPageRequest,
    search: "__nonexistentsearchterm__",
  } satisfies IEnterpriseLmsContentVersion.IRequest;

  const emptyResult = await callContentVersions(emptySearchRequest);
  TestValidator.equals(
    "empty search returns zero results",
    emptyResult.data.length,
    0,
  );
}
