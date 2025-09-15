import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskManagementRoles";
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test verifies that a TPM user can retrieve a filtered and paginated
 * list of task management roles.
 *
 * It performs the user registration and login via /auth/tpm/join and
 * /auth/tpm/login, then exercises the
 * /taskManagement/tpm/taskManagementRoles endpoint by querying with various
 * parameters:
 *
 * - Filtering by search string (to name or code)
 * - Paging with page and limit
 * - Sorting ascending and descending
 *
 * It validates that the returned list matches the applied filters and
 * pagination and that unauthorized users cannot access the roles list.
 */
export async function test_api_task_management_role_list_filtered_paginated(
  connection: api.IConnection,
) {
  // 1. Register TPM user
  const joinRequestBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;

  const authorizedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinRequestBody });
  typia.assert(authorizedUser);

  // 2. Login with the same user
  const loginRequestBody = {
    email: joinRequestBody.email,
    password: joinRequestBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginRequestBody });
  typia.assert(loginUser);

  // Ensure the connection is authenticated with updated access token
  // (SDK internally manages headers, so the token should be updated)

  // 3. Baseline request: no filters, default pagination
  let requestBody = {} satisfies ITaskManagementTaskManagementRoles.IRequest;
  let response: IPageITaskManagementTaskManagementRoles =
    await api.functional.taskManagement.tpm.taskManagementRoles.index(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // Assert pagination
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );

  // Assert that each role has at least id, code, name
  for (const role of response.data) {
    typia.assert(role);
    TestValidator.predicate(
      "role has non-empty id",
      typeof role.id === "string" && role.id.length > 0,
    );
    TestValidator.predicate(
      "role has code",
      typeof role.code === "string" && role.code.length > 0,
    );
    TestValidator.predicate(
      "role has name",
      typeof role.name === "string" && role.name.length > 0,
    );
  }

  // 4. Test search filtering: search by code substring
  if (response.data.length > 0) {
    const sampleCode = response.data[0].code.substring(0, 2);
    requestBody = {
      search: sampleCode,
    } satisfies ITaskManagementTaskManagementRoles.IRequest;
    response =
      await api.functional.taskManagement.tpm.taskManagementRoles.index(
        connection,
        { body: requestBody },
      );
    typia.assert(response);

    // Check that all returned roles match the search string in code or name
    for (const item of response.data) {
      TestValidator.predicate(
        `role code or name contains search substring '${sampleCode}'`,
        item.code.includes(sampleCode) || item.name.includes(sampleCode),
      );
    }
  }

  // 5. Test pagination: limit 2 items per page, get page 1 and 2
  requestBody = {
    page: 1,
    limit: 2,
  } satisfies ITaskManagementTaskManagementRoles.IRequest;
  const page1 =
    await api.functional.taskManagement.tpm.taskManagementRoles.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current equals 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit equals 2", page1.pagination.limit, 2);

  requestBody = {
    page: 2,
    limit: 2,
  } satisfies ITaskManagementTaskManagementRoles.IRequest;
  const page2 =
    await api.functional.taskManagement.tpm.taskManagementRoles.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current equals 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit equals 2", page2.pagination.limit, 2);

  // Ensure page 1 and 2 data sets do not overlap on IDs
  const page1Ids = new Set(page1.data.map((x) => x.id));
  const overlap = page2.data.some((x) => page1Ids.has(x.id));
  TestValidator.predicate(
    "page 1 and page 2 role sets do not overlap",
    !overlap,
  );

  // 6. Test sorting by code ascending and descending
  requestBody = {
    sort_by: "code",
    order_direction: "asc",
    limit: 50,
  } satisfies ITaskManagementTaskManagementRoles.IRequest;
  const ascResponse =
    await api.functional.taskManagement.tpm.taskManagementRoles.index(
      connection,
      { body: requestBody },
    );
  typia.assert(ascResponse);
  let lastCode = "";
  for (const item of ascResponse.data) {
    TestValidator.predicate("each role code asc order", item.code >= lastCode);
    lastCode = item.code;
  }

  requestBody = {
    sort_by: "code",
    order_direction: "desc",
    limit: 50,
  } satisfies ITaskManagementTaskManagementRoles.IRequest;
  const descResponse =
    await api.functional.taskManagement.tpm.taskManagementRoles.index(
      connection,
      { body: requestBody },
    );
  typia.assert(descResponse);
  lastCode = "\uffff";
  for (const item of descResponse.data) {
    TestValidator.predicate("each role code desc order", item.code <= lastCode);
    lastCode = item.code;
  }

  // 7. Test unauthorized access: simulate using unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot get task management roles",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementRoles.index(
        unauthConnection,
        { body: {} },
      );
    },
  );
}
