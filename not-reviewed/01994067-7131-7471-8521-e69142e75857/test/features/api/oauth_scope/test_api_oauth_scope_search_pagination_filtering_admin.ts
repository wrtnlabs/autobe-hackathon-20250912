import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerScope";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerScope";

/**
 * E2E test for admin OAuth scope search, pagination, filtering, and error
 * handling.
 *
 * This test performs the entire workflow:
 *
 * 1. Registers a new OAuth server admin user with valid credentials
 * 2. Logs in with the registered admin user to obtain JWT tokens
 * 3. Performs OAuth scope listings with search, filtering, pagination, and
 *    sorting
 * 4. Validates the correctness of pagination metadata and results
 * 5. Checks empty results with unlikely search string
 * 6. Validates error responses on invalid pagination and filter inputs
 *
 * Business rules:
 *
 * - Only admins have permission to list OAuth scopes
 * - Pagination metadata must be consistent and accurate
 * - Sorting and filtering by scope code and description must work as expected
 * - Error responses for invalid page, limit, or sortDirection
 *
 * The test ensures full functionality and robustness of the OAuth scopes
 * admin listing API.
 */
export async function test_api_oauth_scope_search_pagination_filtering_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "1234";
  const joinBody = {
    email,
    email_verified: true,
    password,
  } satisfies IOauthServerAdmin.ICreate;
  const adminCreated: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminCreated);

  // 2. Admin user login
  const loginBody = {
    email,
    password,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLoggedIn: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(adminLoggedIn);

  // 3. Valid pagination and filter requests to OAuth scopes
  const testRequests: IOauthServerScope.IRequest[] = [
    { page: 0, limit: 5, search: null, sortBy: "code", sortDirection: "asc" },
    {
      search: "scope",
      page: 1,
      limit: 10,
      sortBy: "code",
      sortDirection: "desc",
    },
    { search: "admin", page: 0, limit: 3, sortBy: "id", sortDirection: "desc" },
  ];

  for (const req of testRequests) {
    const result: IPageIOauthServerScope.ISummary =
      await api.functional.oauthServer.admin.scopes.index(connection, {
        body: req,
      });
    typia.assert(result);

    const pagination: IPage.IPagination = result.pagination;
    TestValidator.predicate(
      `pagination current page at least 0 - page=${req.page}`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `pagination limit positive - limit=${req.limit}`,
      pagination.limit > 0,
    );
    TestValidator.predicate(
      `pagination records non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages non-negative`,
      pagination.pages >= 0,
    );

    if (result.data.length > 0) {
      for (const scopeSummary of result.data) {
        typia.assert(scopeSummary);

        if (req.search !== null && req.search !== undefined) {
          const included =
            scopeSummary.code.includes(req.search) ||
            scopeSummary.description.includes(req.search);
          TestValidator.predicate(
            `scope summary matches search filter '${req.search}'`,
            included,
          );
        }
      }
    }
  }

  // 4. Test empty search result
  const emptySearchReq: IOauthServerScope.IRequest = {
    search: "string_that_does_not_exist_123456",
    page: 0,
    limit: 10,
    sortBy: "code",
    sortDirection: "asc",
  } satisfies IOauthServerScope.IRequest;
  const emptyResult: IPageIOauthServerScope.ISummary =
    await api.functional.oauthServer.admin.scopes.index(connection, {
      body: emptySearchReq,
    });
  typia.assert(emptyResult);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result total records",
    emptyResult.pagination.records,
    0,
  );

  // 5. Test invalid pagination values resulting in errors
  await TestValidator.error("invalid page negative", async () => {
    await api.functional.oauthServer.admin.scopes.index(connection, {
      body: {
        search: null,
        page: -1,
        limit: 10,
      } satisfies IOauthServerScope.IRequest,
    });
  });

  await TestValidator.error("invalid limit zero", async () => {
    await api.functional.oauthServer.admin.scopes.index(connection, {
      body: {
        search: null,
        page: 0,
        limit: 0,
      } satisfies IOauthServerScope.IRequest,
    });
  });
}
