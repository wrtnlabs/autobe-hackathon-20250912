import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementQa";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

export async function test_api_qa_search_paginated_filtered_list_pm_role(
  connection: api.IConnection,
) {
  // Step 1: Create a PM user (join)
  const pmCreateBody = {
    email: `pmuser_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "strongPassword!123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuthorized);

  // Step 2: Login the PM user explicitly (simulate login token refresh)
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLoginAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmLoginAuthorized);

  // Step 3: Perform QA user searches with various filters and pagination

  // Test case 1: Empty filter (should return first page default limit)
  const emptyFilterReq = {} satisfies ITaskManagementQa.IRequest;
  const emptyFilterRes: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.pm.taskManagement.qas.index(
      connection,
      { body: emptyFilterReq },
    );
  typia.assert(emptyFilterRes);
  TestValidator.predicate(
    "empty filter returns array",
    Array.isArray(emptyFilterRes.data) && emptyFilterRes.data.length > 0,
  );
  TestValidator.predicate(
    "pagination current page should be >= 0",
    emptyFilterRes.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    emptyFilterRes.pagination.limit >= 0,
  );

  // Test case 2: Filter by partial email (case-insensitive contains)
  if (emptyFilterRes.data.length > 0) {
    const partialEmail = emptyFilterRes.data[0].email.substring(1, 6);
    const filterByEmailReq = {
      email: partialEmail,
      page: 0,
      limit: 5,
    } satisfies ITaskManagementQa.IRequest;

    const filterByEmailRes =
      await api.functional.taskManagement.pm.taskManagement.qas.index(
        connection,
        { body: filterByEmailReq },
      );
    typia.assert(filterByEmailRes);
    TestValidator.predicate(
      `all returned emails contain '${partialEmail}'`,
      filterByEmailRes.data.every((qa) =>
        qa.email.toLowerCase().includes(partialEmail.toLowerCase()),
      ),
    );
  }

  // Test case 3: Filter by partial name (case-insensitive contains)
  if (emptyFilterRes.data.length > 0) {
    const partialName = emptyFilterRes.data[0].name.substring(0, 3);
    const filterByNameReq = {
      name: partialName,
      page: 0,
      limit: 5,
    } satisfies ITaskManagementQa.IRequest;

    const filterByNameRes =
      await api.functional.taskManagement.pm.taskManagement.qas.index(
        connection,
        { body: filterByNameReq },
      );
    typia.assert(filterByNameRes);
    TestValidator.predicate(
      `all returned names contain '${partialName}'`,
      filterByNameRes.data.every((qa) =>
        qa.name.toLowerCase().includes(partialName.toLowerCase()),
      ),
    );
  }

  // Test case 4: Filtering by created_at with ISO 8601 format - using earliest date
  const filterCreatedAtReq = {
    created_at: "1970-01-01T00:00:00Z",
    page: 0,
    limit: 3,
  } satisfies ITaskManagementQa.IRequest;

  const filterCreatedAtRes =
    await api.functional.taskManagement.pm.taskManagement.qas.index(
      connection,
      { body: filterCreatedAtReq },
    );
  typia.assert(filterCreatedAtRes);
  TestValidator.predicate(
    "returned data created_at filter effective",
    Array.isArray(filterCreatedAtRes.data),
  );

  // Test case 5: Filtering by updated_at (same as created_at test)
  const filterUpdatedAtReq = {
    updated_at: "1970-01-01T00:00:00Z",
    page: 0,
    limit: 3,
  } satisfies ITaskManagementQa.IRequest;

  const filterUpdatedAtRes =
    await api.functional.taskManagement.pm.taskManagement.qas.index(
      connection,
      { body: filterUpdatedAtReq },
    );
  typia.assert(filterUpdatedAtRes);
  TestValidator.predicate(
    "returned data updated_at filter effective",
    Array.isArray(filterUpdatedAtRes.data),
  );

  // Test case 6: Pagination test - requesting page 1 with limit 2
  const paginationReq = {
    page: 1,
    limit: 2,
  } satisfies ITaskManagementQa.IRequest;
  const paginationRes =
    await api.functional.taskManagement.pm.taskManagement.qas.index(
      connection,
      { body: paginationReq },
    );
  typia.assert(paginationRes);
  TestValidator.equals(
    "pagination current page",
    paginationRes.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginationRes.pagination.limit, 2);

  // Test case 7: Invalid filter error scenario - invalid date format (expect error)
  await TestValidator.error(
    "should fail with invalid created_at date format",
    async () => {
      const invalidDateReq = {
        created_at: "invalid-date-format",
      } satisfies ITaskManagementQa.IRequest;
      await api.functional.taskManagement.pm.taskManagement.qas.index(
        connection,
        {
          body: invalidDateReq,
        },
      );
    },
  );

  // Test case 8: Unauthorized access - simulate by clearing headers and calling API (expect error)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "should fail unauthorized with no auth headers",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.qas.index(
        unauthenticatedConnection,
        { body: {} satisfies ITaskManagementQa.IRequest },
      );
    },
  );
}
