import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";

/**
 * Test function validating developer registration, authentication, and task
 * status search.
 *
 * This test covers developer user join/login flows and ensures the PATCH
 * endpoint /taskManagement/developer/taskManagementTaskStatuses supports
 * filtering, pagination, and authorization correctly. It validates response
 * schema and business logic.
 */
export async function test_api_task_management_task_status_search_as_developer(
  connection: api.IConnection,
) {
  // Step 1. Register a developer user
  const developerCreateBody = {
    email: `developer${Date.now()}@test.example.com`,
    password_hash: "hashedPassword123!", // Simulate a hashed password
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;

  const joinedDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(joinedDeveloper);
  TestValidator.predicate(
    "developer token access is not empty",
    joinedDeveloper?.token?.access.length > 0,
  );

  // Step 2. Logout by clearing connection headers to simulate unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Validate unauthorized error on status search without auth
  await TestValidator.error(
    "task status search should fail when unauthenticated",
    async () => {
      await api.functional.taskManagement.developer.taskManagementTaskStatuses.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // Step 3. Login with the developer user
  const loginBody = {
    email: developerCreateBody.email,
    password: "plainPasswordIgnoredInMock",
  } satisfies ITaskManagementDeveloper.ILogin;

  const loggedInDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInDeveloper);

  TestValidator.equals(
    "logged in developer email matches",
    loggedInDeveloper.email,
    developerCreateBody.email,
  );

  // Step 4. Define a series of test query bodies for task status search
  const queries: ITaskManagementTaskStatuses.IRequest[] = [
    {}, // Default: no filter
    { page: 1, limit: 5 }, // Basic pagination
    { code: "to_do" }, // Filtering by code
    { name: "Complete" }, // Filtering by name
    { page: 1, limit: 10, orderBy: "name_ASC" }, // Sorted ascending by name
    { page: 1, limit: 10, orderBy: "name_DESC" }, // Sorted descending by name
    { code: "nonexistent_code_xyz" }, // Filter giving empty result
  ];

  // Helper: Validate unique codes and names in the status list
  function validateUniqueStatuses(
    data: ITaskManagementTaskStatuses.ISummary[],
  ) {
    const codes = data.map((status) => status.code);
    const names = data.map((status) => status.name);
    const hasDuplicateCodes = new Set(codes).size !== codes.length;
    const hasDuplicateNames = new Set(names).size !== names.length;
    TestValidator.predicate("no duplicate status codes", !hasDuplicateCodes);
    TestValidator.predicate("no duplicate status names", !hasDuplicateNames);
  }

  // Step 5. Execute multiple queries and validate responses
  for (const query of queries) {
    const response =
      await api.functional.taskManagement.developer.taskManagementTaskStatuses.index(
        connection,
        {
          body: query,
        },
      );
    typia.assert(response);

    // Validate pagination object
    TestValidator.predicate(
      "pagination current page is positive",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination pages is positive",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records count is non-negative",
      response.pagination.records >= 0,
    );

    // Validate pages and records relationship
    const expectPages = Math.ceil(
      response.pagination.records / (response.pagination.limit || 1),
    );
    if (response.pagination.records > 0) {
      TestValidator.equals(
        "pagination pages correctly calculated",
        response.pagination.pages,
        expectPages,
      );
    }

    // Validate each status item
    for (const status of response.data) {
      typia.assert(status);
      TestValidator.predicate(
        `status code is non-empty string: ${status.code}`,
        status.code.length > 0,
      );
      TestValidator.predicate(
        `status name is non-empty string: ${status.name}`,
        status.name.length > 0,
      );
      if (status.description !== null && status.description !== undefined) {
        TestValidator.predicate(
          `status description is string if present: ${String(status.description)}`,
          typeof status.description === "string",
        );
      }
    }

    // Validate uniqueness of codes and names
    validateUniqueStatuses(response.data);

    // Further logical checks based on filters
    if (query.code !== undefined && query.code !== null) {
      TestValidator.predicate(
        "all returned status codes contain filter code",
        response.data.every((s) => s.code.includes(query.code!)),
      );
    }

    if (query.name !== undefined && query.name !== null) {
      TestValidator.predicate(
        "all returned status names contain filter name",
        response.data.every((s) => s.name.includes(query.name!)),
      );
    }
  }
}
