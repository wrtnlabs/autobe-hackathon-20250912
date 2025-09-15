import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContents";

export async function test_api_content_search_pagination_corplearner(
  connection: api.IConnection,
) {
  // Step 1: Register a new corporate learner user for tenant-scoped access
  const createBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "TestPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const createdUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createBody,
    });
  typia.assert(createdUser);

  // Step 2: Log in to acquire JWT token and authenticated session
  const loginBody = {
    email: createdUser.email,
    password: "TestPass123!",
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Prepare valid content search filter
  // Use tenant_id from created user (tenant scoped)
  const tenantId = createdUser.tenant_id;

  // Compose title filter substring randomly from a generated title
  const fullTitle = RandomGenerator.paragraph({ sentences: 5 });
  // Pick a random substring of the full title for partial matching
  const titleSearch = RandomGenerator.substring(fullTitle);

  // Step 3: Perform paginated content search with filters
  const searchRequest = {
    tenant_id: tenantId,
    title: titleSearch,
    status: "active",
    page: 1,
    limit: 10,
    sort_field: "title",
    sort_direction: "asc",
  } satisfies IEnterpriseLmsContents.IRequest;

  const searchResult: IPageIEnterpriseLmsContents.ISummary =
    await api.functional.enterpriseLms.corporateLearner.contents.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(searchResult);

  // Step 4: Validation of paginated results
  TestValidator.predicate(
    "pagination current page",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    searchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    searchResult.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination total records positive",
    searchResult.pagination.records >= 0,
  );

  // Step 5: Validate search filter semantics
  for (const content of searchResult.data) {
    TestValidator.equals("content tenant_id", content.tenant_id, tenantId);

    TestValidator.predicate(
      `content title contains search substring: ${titleSearch}`,
      content.title.includes(titleSearch),
    );

    TestValidator.equals("content status is active", content.status, "active");

    // Validate soft delete exclusion by ensuring no deleted_at in content
    // Since deleted_at is not in response summary, we validate business_status is not "deleted"
    TestValidator.notEquals(
      "content business_status is not deleted",
      content.business_status,
      "deleted",
    );
  }

  // Step 6: Test error handling for invalid filter: page=0 (invalid, minimum is 1)
  await TestValidator.error(
    "content search with invalid page (0) should error",
    async () => {
      const invalidRequest = {
        ...searchRequest,
        page: 0,
      } satisfies IEnterpriseLmsContents.IRequest;

      await api.functional.enterpriseLms.corporateLearner.contents.index(
        connection,
        { body: invalidRequest },
      );
    },
  );

  // Step 7: Test unauthorized access: empty headers (simulate unauthenticated)
  // Create new connection without Authorization headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to content search should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.contents.index(
        unauthenticatedConnection,
        { body: searchRequest },
      );
    },
  );
}
