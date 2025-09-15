import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsSystemAdmin";

/**
 * Comprehensive test for searching system administrator users with
 * pagination.
 *
 * This test covers the entire flow:
 *
 * 1. Create a system administrator user with realistic data.
 * 2. Authenticate the user to obtain a valid bearer token.
 * 3. Perform paged search queries for system admins with various filter
 *    criteria, including email and status-based filters.
 * 4. Check the paginated response correctness, including metadata like current
 *    page, total pages, and total records.
 * 5. Validate that the created user appears in search results when filtered
 *    appropriately.
 * 6. Test edge cases such as empty filters, null filters, and excessive page
 *    numbers.
 * 7. Verify unauthorized accesses.
 */
export async function test_api_systemadmin_search_systemadmins_with_pagination(
  connection: api.IConnection,
) {
  // 1. Create system administrator user
  const createBody = {
    email: `test-${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32), // Simulate hashed password
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const createdAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(createdAdmin);

  // 2. Authenticate the created user - connection.headers.Authorization will be set
  const loginBody = {
    email: createdAdmin.email,
    password_hash: createBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const authResult: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(authResult);

  TestValidator.equals(
    "Authenticated user email matches created",
    authResult.email,
    createBody.email,
  );

  // After login, the connection includes auth token header, so use the same connection

  // 3. Test searching system admins with filters
  const searchRequests: IEnterpriseLmsSystemAdmin.IRequest[] = [
    // Normal search by email substring
    {
      filterByEmail: createdAdmin.email.substring(0, 5),
      page: 1,
      limit: 10,
    },
    // Search by status
    {
      filterByStatus: "active",
      page: 1,
      limit: 5,
    },
    // Empty filters with explicit null
    {
      filterByEmail: null,
      filterByStatus: null,
      page: 1,
      limit: 10,
    },
    // Null filters and sorting
    {
      search: null,
      filterByEmail: null,
      filterByStatus: null,
      sort: "created_at desc",
      page: 1,
      limit: 20,
    },
    // Large page number (likely no data)
    {
      page: 9999,
      limit: 10,
    },
  ];

  for (const req of searchRequests) {
    const result: IPageIEnterpriseLmsSystemAdmin.ISummary =
      await api.functional.enterpriseLms.systemAdmin.systemadmins.index(
        connection,
        {
          body: req,
        },
      );
    typia.assert(result);

    TestValidator.predicate(
      `pagination current page >= 1 for page ${req.page ?? "unknown"}`,
      result.pagination.current >= 1,
    );

    TestValidator.predicate(
      `pagination limit > 0 for page ${req.page ?? "unknown"}`,
      result.pagination.limit > 0,
    );

    TestValidator.predicate(
      "pagination pages >= 0",
      result.pagination.pages >= 0,
    );

    TestValidator.predicate(
      "pagination records >= 0",
      result.pagination.records >= 0,
    );

    TestValidator.predicate(
      "page count matches pages or is zero when no records",
      result.pagination.pages === 0 ||
        result.pagination.pages >= result.pagination.current,
    );

    if (result.pagination.records > 0) {
      TestValidator.predicate(
        "data array length less or equal limit",
        result.data.length <= result.pagination.limit,
      );

      if (req.filterByEmail !== null && req.filterByEmail !== undefined) {
        for (const user of result.data) {
          TestValidator.predicate(
            `email contains filterByEmail substring: ${req.filterByEmail}`,
            user.email.includes(req.filterByEmail),
          );
        }
      }

      if (req.filterByStatus !== null && req.filterByStatus !== undefined) {
        for (const user of result.data) {
          TestValidator.equals(
            "user status matches filterByStatus",
            user.status,
            req.filterByStatus,
          );
        }
      }

      // Check created admin appears in results when filter allows
      const validEmail =
        req.filterByEmail === null ||
        req.filterByEmail === undefined ||
        createBody.email.includes(req.filterByEmail);
      const validStatus =
        req.filterByStatus === null ||
        req.filterByStatus === undefined ||
        createBody.status === req.filterByStatus;
      if (validEmail && validStatus) {
        const found = result.data.some(
          (user) => user.email === createBody.email,
        );
        TestValidator.predicate(
          "created admin appears in search result",
          found === true,
        );
      }
    }
  }

  // 4. Test unauthorized access with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized search should throw", async () => {
    await api.functional.enterpriseLms.systemAdmin.systemadmins.index(
      unauthConn,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEnterpriseLmsSystemAdmin.IRequest,
      },
    );
  });
}
