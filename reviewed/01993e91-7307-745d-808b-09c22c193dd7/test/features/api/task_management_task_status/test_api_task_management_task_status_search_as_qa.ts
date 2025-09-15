import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";

/**
 * Test the Task Management Task Status search API for QA users.
 *
 * This test validates the end-to-end functionality where a QA user is able to
 * register, login, and perform filtered paginated search queries for task
 * statuses through the PATCH endpoint.
 *
 * The test includes validation of response structure, pagination correctness,
 * and security by checking unauthorized access and invalid requests.
 *
 * Steps:
 *
 * 1. Register new QA user and verify authorization info
 * 2. Login QA user and verify authorization
 * 3. Perform multiple valid search queries with different filters and pagination
 *    settings
 * 4. Confirm response pagination and each status entry validity
 * 5. Verify unauthorized search access is rejected
 * 6. Verify error responses for invalid search parameters
 */
export async function test_api_task_management_task_status_search_as_qa(
  connection: api.IConnection,
) {
  // 1. Register new QA user
  const createBody = {
    email: `qa_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementQa.ICreate;

  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: createBody });
  typia.assert(qaUser);

  // 2. Login QA user
  const loginBody = {
    email: createBody.email,
    password: createBody.password_hash,
  } satisfies ITaskManagementQa.ILogin;

  const loggedIn: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // 3. Define utility function to validate pagination response structure
  function validatePagination(
    pagination: IPage.IPagination,
    page: number,
    limit: number,
  ) {
    TestValidator.predicate(
      "pagination current page matches requested page",
      pagination.current === page,
    );
    TestValidator.predicate(
      "pagination limit matches requested limit",
      pagination.limit === limit,
    );
    TestValidator.predicate(
      "pagination records and pages non-negative",
      pagination.records >= 0 && pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination pages correct calculation",
      pagination.pages === Math.ceil(pagination.records / pagination.limit),
    );
  }

  // 4. Test several successful search queries
  const searchRequests: ITaskManagementTaskStatuses.IRequest[] = [
    {},
    { page: 1, limit: 10 },
    { page: 2, limit: 5, orderBy: "code" },
    { code: "to_do" },
    { name: "Done" },
    { code: "in_progress", page: 1, limit: 3, orderBy: "name" },
  ];

  for (const req of searchRequests) {
    const response: IPageITaskManagementTaskStatuses.ISummary =
      await api.functional.taskManagement.qa.taskManagementTaskStatuses.index(
        connection,
        { body: req },
      );

    typia.assert(response);

    validatePagination(
      response.pagination,
      req.page ?? 1,
      req.limit ?? response.pagination.limit,
    );

    TestValidator.predicate(
      "response data is array",
      Array.isArray(response.data),
    );

    for (const status of response.data) {
      typia.assert(status);
      TestValidator.predicate(
        "status.code is non-empty string",
        typeof status.code === "string" && status.code.length > 0,
      );
      TestValidator.predicate(
        "status.name is non-empty string",
        typeof status.name === "string" && status.name.length > 0,
      );
      if (status.description !== null && status.description !== undefined) {
        TestValidator.predicate(
          "status.description is string if present",
          typeof status.description === "string",
        );
      }
    }
  }

  // 5. Security test: Unsigned connection must not access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized search attempts fail", async () => {
    await api.functional.taskManagement.qa.taskManagementTaskStatuses.index(
      unauthenticatedConnection,
      { body: {} },
    );
  });

  // 6. Error tests with invalid request body
  const invalidRequests: Partial<ITaskManagementTaskStatuses.IRequest>[] = [
    { page: -1 },
    { limit: 0 },
    { limit: 10000 },
    { orderBy: "invalid_field" },
  ];

  for (const invalidReq of invalidRequests) {
    // We build a full request, filling absent optional properties with null explicitly
    const fullReq: ITaskManagementTaskStatuses.IRequest = {
      code: null,
      name: null,
      page: null,
      limit: null,
      orderBy: null,
      ...invalidReq,
    };
    await TestValidator.error(
      `error for invalid request: ${JSON.stringify(invalidReq)}`,
      async () => {
        await api.functional.taskManagement.qa.taskManagementTaskStatuses.index(
          connection,
          { body: fullReq },
        );
      },
    );
  }
}
