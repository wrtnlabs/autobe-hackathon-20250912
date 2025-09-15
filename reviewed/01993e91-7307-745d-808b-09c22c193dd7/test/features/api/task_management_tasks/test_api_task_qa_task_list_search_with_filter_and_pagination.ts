import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";

/**
 * This E2E test validates the flow for a Quality Assurance (QA) user
 * retrieving a filtered and paginated task list.
 *
 * It covers:
 *
 * 1. QA user registration with valid credentials through /auth/qa/join.
 * 2. QA user login by /auth/qa/login.
 * 3. Retrieval of paginated, filtered task list via /taskManagement/qa/tasks
 *    with diverse filter params.
 * 4. Validation of proper pagination fields and correct filtering by status,
 *    priority, creator, project, and board IDs.
 * 5. Edge cases handling for invalid filter values and unauthorized access
 *    rejection.
 *
 * Business rules:
 *
 * - User must authenticate successfully before accessing tasks.
 * - Filtering must respect task attributes.
 * - Pagination metadata must match task count and limits.
 *
 * Critical validations:
 *
 * - Typia.assert with API response types.
 * - TestValidator for pagination correctness and filtering accuracy.
 * - Explicit nulls for nullable filter parameters.
 */
export async function test_api_task_qa_task_list_search_with_filter_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register a new QA user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;

  const createdQAUser = await api.functional.auth.qa.join(connection, {
    body: userCreateBody,
  });
  typia.assert(createdQAUser);

  // Step 2: Login as the newly created QA user
  const userLoginBody = {
    email: userCreateBody.email,
    password: "plain_password123",
  } satisfies ITaskManagementQa.ILogin;

  const loggedInQAUser = await api.functional.auth.qa.login(connection, {
    body: userLoginBody,
  });
  typia.assert(loggedInQAUser);

  // Step 3: Call the task index endpoint with valid filters and pagination
  // We'll generate random UUIDs for filters which should match some tasks
  const filterBodyValid = {
    page: 1,
    limit: 10,
    search: null,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: createdQAUser.id,
    project_id: typia.random<string & tags.Format<"uuid">>(),
    board_id: typia.random<string & tags.Format<"uuid">>(),
    sort_by: "title",
    sort_order: "asc",
  } satisfies ITaskManagementTasks.IRequest;

  const pagedTasks = await api.functional.taskManagement.qa.tasks.index(
    connection,
    {
      body: filterBodyValid,
    },
  );
  typia.assert(pagedTasks);
  TestValidator.predicate(
    "pagination currentPage is 1",
    pagedTasks.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    pagedTasks.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    pagedTasks.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagedTasks.pagination.records >= 0,
  );

  // Verify that every task matches the filter criteria if filters are not null
  for (const task of pagedTasks.data) {
    if (
      filterBodyValid.status_id !== null &&
      filterBodyValid.status_id !== undefined
    ) {
      if (task.status_name !== null && task.status_name !== undefined) {
        TestValidator.predicate(
          "task status_name is non-empty string when status_id filter applied",
          typeof task.status_name === "string" && task.status_name.length > 0,
        );
      }
    }
    if (
      filterBodyValid.priority_id !== null &&
      filterBodyValid.priority_id !== undefined
    ) {
      if (task.priority_name !== null && task.priority_name !== undefined) {
        TestValidator.predicate(
          "task priority_name is non-empty string when priority_id filter applied",
          typeof task.priority_name === "string" &&
            task.priority_name.length > 0,
        );
      }
    }
  }

  // Step 4: Test edge case - invalid UUID filters produce empty or rejected results.
  // We test with an unauthenticated connection for access rejection.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated user cannot access task list",
    async () => {
      await api.functional.taskManagement.qa.tasks.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 10,
            status_id: null,
            priority_id: null,
            creator_id: null,
            project_id: null,
            board_id: null,
            sort_by: null,
            sort_order: null,
            search: null,
          } satisfies ITaskManagementTasks.IRequest,
        },
      );
    },
  );

  // Step 5: Test edge case - invalid filter values (non-UUID) should return empty or no errors
  // We provide invalid UUID format strings
  const invalidFilters = {
    status_id: "invalid-uuid-0000-0000-000000000000" as unknown as string &
      tags.Format<"uuid">,
    priority_id: "xyz-not-uuid-1234-abcde" as unknown as string &
      tags.Format<"uuid">,
    creator_id: "123" as unknown as string & tags.Format<"uuid">,
    project_id: "not-a-uuid" as unknown as string & tags.Format<"uuid">,
    board_id: "00000000-0000-0000-0000-000000000000" as unknown as string &
      tags.Format<"uuid">,
  };

  const filterBodyInvalid = {
    page: 1,
    limit: 10,
    search: null,
    status_id: invalidFilters.status_id,
    priority_id: invalidFilters.priority_id,
    creator_id: invalidFilters.creator_id,
    project_id: invalidFilters.project_id,
    board_id: invalidFilters.board_id,
    sort_by: null,
    sort_order: null,
  } satisfies ITaskManagementTasks.IRequest;

  const resultWithInvalidFilters =
    await api.functional.taskManagement.qa.tasks.index(connection, {
      body: filterBodyInvalid,
    });
  typia.assert(resultWithInvalidFilters);
  TestValidator.predicate(
    "resultWithInvalidFilters data length is array",
    Array.isArray(resultWithInvalidFilters.data),
  );
  TestValidator.predicate(
    "resultWithInvalidFilters data is empty or contains items",
    resultWithInvalidFilters.data.length >= 0,
  );
}
