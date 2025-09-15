import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";

/**
 * This E2E test function verifies the PATCH
 * /taskManagement/pm/taskManagementTaskStatuses endpoint from a PM role
 * perspective. It starts by creating a new PM user through the
 * /auth/pm/join endpoint with proper user details (email, password, and
 * name). Then, it authenticates by logging in using /auth/pm/login to
 * establish authorized access.
 *
 * Next, it proceeds to test the search and pagination capabilities of the
 * statuses endpoint by sending filtering requests with combinations of
 * 'code' and 'name' fields, along with pagination parameters 'page',
 * 'limit', and 'orderBy'. It verifies the response contains a correctly
 * structured page object, with pagination metadata and a filtered list of
 * status summaries. All task statuses in the response list are asserted to
 * match the filter criteria provided.
 *
 * The test also attempts to call the search API without authorization and
 * expects an error due to forbidden access. Additionally, the test checks
 * invalid input cases, for example page or limit set to negative or zero
 * values, asserting the API responds with an error.
 *
 * This workflow confirms access control, filtering, pagination, and error
 * handling requirements for PM role users on task status listings.
 */
export async function test_api_task_management_task_statuses_search_and_pagination_pm_role(
  connection: api.IConnection,
) {
  // 1. PM user join
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = "Password1234!";
  const pmName = RandomGenerator.name();
  const pmCreateBody = {
    email: pmEmail,
    password: pmPassword,
    name: pmName,
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuthorized);

  // 2. PM user login
  const pmLoginBody = {
    email: pmEmail,
    password: pmPassword,
  } satisfies ITaskManagementPm.ILogin;

  const pmLogged: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmLogged);

  // 3. Search task statuses with pagination and filtering
  // Prepare multiple test cases with different filters and pagination
  const testCases: ITaskManagementTaskStatuses.IRequest[] = [
    { page: 1, limit: 10 },
    { code: "to_do" },
    { name: "In Progress" },
    { code: "done", page: 2, limit: 5 },
    { name: "In Progress", limit: 5 },
    { code: "to_do", name: "To Do", page: 1, limit: 5, orderBy: "code" },
  ];

  for (const requestBody of testCases) {
    // Execute the search
    const response: IPageITaskManagementTaskStatuses.ISummary =
      await api.functional.taskManagement.pm.taskManagementTaskStatuses.index(
        connection,
        { body: requestBody },
      );
    typia.assert(response);

    // Validate pagination
    TestValidator.predicate(
      "pagination.current should be >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination.limit should be > 0",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination.pages should be >= 1",
      response.pagination.pages >= 1,
    );
    TestValidator.predicate(
      "pagination.records should be >= 0",
      response.pagination.records >= 0,
    );

    // Validate that data list items match the filter criteria
    for (const item of response.data) {
      typia.assert(item);
      if (requestBody.code !== undefined && requestBody.code !== null) {
        TestValidator.predicate(
          `item.code (${item.code}) includes filter code (${requestBody.code})`,
          item.code.includes(requestBody.code),
        );
      }
      if (requestBody.name !== undefined && requestBody.name !== null) {
        TestValidator.predicate(
          `item.name (${item.name}) includes filter name (${requestBody.name})`,
          item.name.includes(requestBody.name),
        );
      }
    }
  }

  // 4. Access control test: Try without authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should be forbidden",
    async () => {
      await api.functional.taskManagement.pm.taskManagementTaskStatuses.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 5. Test invalid inputs - negative page or zero/negative limit
  const invalidInputs: ITaskManagementTaskStatuses.IRequest[] = [
    { page: -1 },
    { limit: 0 },
    { page: 0, limit: -5 },
  ];
  for (const invalidBody of invalidInputs) {
    await TestValidator.error(
      `invalid input with page=${invalidBody.page} and limit=${invalidBody.limit} should throw`,
      async () => {
        await api.functional.taskManagement.pm.taskManagementTaskStatuses.index(
          connection,
          { body: invalidBody },
        );
      },
    );
  }
}
