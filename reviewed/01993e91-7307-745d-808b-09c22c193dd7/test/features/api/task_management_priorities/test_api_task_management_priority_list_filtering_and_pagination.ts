import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementPriorities } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementPriorities";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriorities } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriorities";

/**
 * This E2E test verifies the task management priorities listing with
 * filters and pagination for PMO users. It performs user
 * registration/login, and multiple index calls with varied filter criteria.
 * It validates response structure, pagination correctness, filtering,
 * sorting, edge cases, and unauthorized access.
 */
export async function test_api_task_management_priority_list_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const joinBody = {
    email: `pmo_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const joinOutput: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(joinOutput);

  // 2. PMO user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loginOutput: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loginOutput);

  // 3. Default paginated retrieval
  const defaultRequest: ITaskManagementPriorities.IRequest = {};
  let pageResult: IPageITaskManagementPriorities.ISummary =
    await api.functional.taskManagement.pmo.taskManagementPriorities.index(
      connection,
      { body: defaultRequest },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "pagination current page must be >= 1",
    pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "data array must not be null",
    Array.isArray(pageResult.data),
  );

  // Check data count does not exceed limit (implicit default limit may apply)
  TestValidator.predicate(
    "number of data items should not exceed limit",
    pageResult.data.length <= pageResult.pagination.limit,
  );

  // 4. Filter by search string
  if (pageResult.data.length > 0) {
    const firstPriority = pageResult.data[0];
    const filterRequest: ITaskManagementPriorities.IRequest = {
      search: firstPriority.code,
    };
    pageResult =
      await api.functional.taskManagement.pmo.taskManagementPriorities.index(
        connection,
        { body: filterRequest },
      );
    typia.assert(pageResult);

    TestValidator.predicate(
      `filtering returned at least one item for code ${firstPriority.code}`,
      pageResult.data.some(
        (item) =>
          item.code === firstPriority.code ||
          item.name.includes(firstPriority.name),
      ),
    );
  }

  // 5. Pagination with page and limit
  const paginationRequest: ITaskManagementPriorities.IRequest = {
    page: 1,
    limit: 3,
  };
  pageResult =
    await api.functional.taskManagement.pmo.taskManagementPriorities.index(
      connection,
      { body: paginationRequest },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "pagination limit should be 3",
    pageResult.pagination.limit,
    3,
  );

  TestValidator.predicate(
    "number of data items should not exceed limit",
    pageResult.data.length <= 3,
  );

  // 6. Sorting by name ascending
  const sortingRequest: ITaskManagementPriorities.IRequest = {
    orderBy: "name",
    orderDirection: "asc",
  };
  pageResult =
    await api.functional.taskManagement.pmo.taskManagementPriorities.index(
      connection,
      { body: sortingRequest },
    );
  typia.assert(pageResult);

  // Verify sorting ascending by name
  for (let i = 1; i < pageResult.data.length; i++) {
    TestValidator.predicate(
      `sorted ascending check index ${i}`,
      pageResult.data[i - 1].name <= pageResult.data[i].name,
    );
  }

  // 7. Edge case: empty search (unlikely string)
  const emptySearchRequest: ITaskManagementPriorities.IRequest = {
    search: "NoPriorityShouldMatchThisString12345",
  };
  pageResult =
    await api.functional.taskManagement.pmo.taskManagementPriorities.index(
      connection,
      { body: emptySearchRequest },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "empty search should return no data",
    pageResult.data.length,
    0,
  );

  // 8. Edge case: pagination beyond limits
  const outOfRangeRequest: ITaskManagementPriorities.IRequest = {
    page: 9999,
    limit: 5,
  };
  pageResult =
    await api.functional.taskManagement.pmo.taskManagementPriorities.index(
      connection,
      { body: outOfRangeRequest },
    );
  typia.assert(pageResult);

  TestValidator.predicate(
    "pagination current should not exceed total pages",
    pageResult.pagination.current <= pageResult.pagination.pages ||
      pageResult.pagination.pages === 0,
  );

  // 9. Authorization failure test
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthenticated call fails", async () => {
    await api.functional.taskManagement.pmo.taskManagementPriorities.index(
      unauthConnection,
      { body: defaultRequest },
    );
  });
}
