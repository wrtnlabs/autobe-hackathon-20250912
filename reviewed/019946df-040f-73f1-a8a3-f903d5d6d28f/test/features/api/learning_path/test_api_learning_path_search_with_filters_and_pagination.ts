import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPath";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsLearningPath";

/**
 * This E2E test validates the search functionality for enterprise LMS
 * learning paths as a system admin user.
 *
 * It covers the following scenarios:
 *
 * 1. System admin registration and authentication.
 * 2. Successful search with various valid filter parameters, validating
 *    returned data matches filters.
 * 3. Pagination correctness with page and limit parameters.
 * 4. Sorting by fields with ascending/descending order.
 * 5. Authorization enforcement by trying access without authentication.
 * 6. Error handling validation when using invalid filters.
 *
 * Each step verifies the data structure with typia asserts and business
 * rules using TestValidator. Authentication tokens are handled
 * automatically by SDK.
 */
export async function test_api_learning_path_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. System admin registration and authentication
  const systemAdminCreateBody = {
    email: RandomGenerator.alphaNumeric(5) + "@company.com",
    password_hash: RandomGenerator.alphaNumeric(10),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  // Join endpoint to create and authenticate system admin user
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);
  TestValidator.predicate(
    "system admin token is non-empty",
    typeof systemAdmin.token.access === "string" &&
      systemAdmin.token.access.length > 0,
  );

  // Helper to generate valid filter request bodies
  function makeRequestBody(): IEnterpriseLmsLearningPath.IRequest {
    return {
      page: 1,
      limit: 10,
      search: null,
      status: null,
      orderBy: null,
      orderDirection: null,
    };
  }

  // 2. Successful searches with different filters

  // 2.1 Default search, should return page with data
  {
    const reqBody = makeRequestBody();
    const res =
      await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
        connection,
        { body: reqBody },
      );
    typia.assert(res);
    TestValidator.predicate(
      "response has pagination info",
      res.pagination !== undefined &&
        res.pagination.current === 1 &&
        res.pagination.limit === 10 &&
        res.pagination.records >= 0,
    );
    TestValidator.predicate("response data is array", Array.isArray(res.data));
  }

  // 2.2 Search filtered by status
  for (const status of ["active", "inactive", "archived"] as const) {
    const reqBody = makeRequestBody();
    reqBody.status = status;
    const res =
      await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
        connection,
        { body: reqBody },
      );
    typia.assert(res);
    TestValidator.predicate(
      `all items have status ${status}`,
      res.data.every((lp) => lp.status === status),
    );
  }

  // 2.3 Search with full text in search field
  {
    const reqBody = makeRequestBody();
    reqBody.search = "Path" + RandomGenerator.alphaNumeric(2);
    const res =
      await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
        connection,
        { body: reqBody },
      );
    typia.assert(res);
    TestValidator.predicate("data length matches limit", res.data.length <= 10);
  }

  // 2.4 Search with pagination page 2
  {
    const reqBody = makeRequestBody();
    reqBody.page = 2;
    reqBody.limit = 5;
    const res =
      await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
        connection,
        { body: reqBody },
      );
    typia.assert(res);
    TestValidator.equals("pagination current is 2", res.pagination.current, 2);
    TestValidator.equals("pagination limit is 5", res.pagination.limit, 5);
  }

  // 2.5 Search with sorting order - code ascending
  {
    const reqBody = makeRequestBody();
    reqBody.orderBy = "code";
    reqBody.orderDirection = "asc";
    const res =
      await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
        connection,
        { body: reqBody },
      );
    typia.assert(res);
    TestValidator.predicate(
      "list is sorted by code asc",
      (() => {
        for (let i = 1; i < res.data.length; i++) {
          if (res.data[i - 1].code > res.data[i].code) return false;
        }
        return true;
      })(),
    );
  }

  // 2.6 Search with sorting order - title descending
  {
    const reqBody = makeRequestBody();
    reqBody.orderBy = "title";
    reqBody.orderDirection = "desc";
    const res =
      await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
        connection,
        { body: reqBody },
      );
    typia.assert(res);
    TestValidator.predicate(
      "list is sorted by title desc",
      (() => {
        for (let i = 1; i < res.data.length; i++) {
          if (res.data[i - 1].title < res.data[i].title) return false;
        }
        return true;
      })(),
    );
  }

  // 3. Authorization enforcement
  // Attempt search with empty headers (unauthenticated)
  {
    // Create a new connection with empty headers to simulate no auth
    const unauthConn: api.IConnection = { ...connection, headers: {} };
    await TestValidator.error(
      "unauthenticated search should fail",
      async () => {
        await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
          unauthConn,
          { body: makeRequestBody() },
        );
      },
    );
  }

  // 4. Error handling validation

  // 4.1 Invalid page number (negative)
  {
    const reqBody = makeRequestBody();
    reqBody.page = -1;
    await TestValidator.error(
      "search with negative page should error",
      async () => {
        await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
          connection,
          { body: reqBody },
        );
      },
    );
  }

  // 4.2 Invalid limit (zero or negative)
  for (const invalidLimit of [0, -5]) {
    const reqBody = makeRequestBody();
    reqBody.limit = invalidLimit;
    await TestValidator.error(
      `search with invalid limit ${invalidLimit} should error`,
      async () => {
        await api.functional.enterpriseLms.systemAdmin.learningPaths.searchLearningPaths(
          connection,
          { body: reqBody },
        );
      },
    );
  }

  // 4.3 Invalid orderBy value (not in enum)
  {
    // The orderBy property is type restricted, so cannot assign any invalid value
    // Hence, we skip invalid enum value testing because it won't compile
    // This is consistent with prompter instructions to ignore type error tests
  }

  // 4.4 Invalid orderDirection value (not in enum)
  {
    // Same as above, invalid enum values cannot be passed due to TypeScript
    // We'll skip this test as it's a type error case
  }
}
