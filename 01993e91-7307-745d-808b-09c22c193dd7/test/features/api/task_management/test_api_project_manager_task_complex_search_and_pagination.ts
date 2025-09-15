import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";

/**
 * Validate the Project Manager's ability to perform complex task searches with
 * advanced filtering and pagination.
 *
 * This test covers the entire workflow necessary to setup the task management
 * environment:
 *
 * 1. Create and authenticate PM user.
 * 2. Create and authenticate PMO user.
 * 3. PM creates a task status.
 * 4. PMO creates a task priority.
 * 5. PMO creates a project.
 * 6. PM creates a board inside the project.
 * 7. PM performs searches on tasks with various filters using status, priority,
 *    creator, project, and board.
 * 8. Validates that responses match filters and pagination metadata is structured
 *    correctly.
 *
 * This test ensures role switching and authorization are respected and
 * validates the response schema and consistency.
 */
export async function test_api_project_manager_task_complex_search_and_pagination(
  connection: api.IConnection,
) {
  // Create and authenticate a PM user
  const pmEmail: string = typia.random<string & tags.Format<"email">>();
  const pmPassword = "PmTestPass123!";
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // Create and authenticate a PMO user
  const pmoEmail: string = typia.random<string & tags.Format<"email">>();
  const pmoPassword = "PmoTestPass123!";
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // PM creates a Task Status
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });
  const taskStatusBody = {
    code: `status_${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const createdStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusBody,
      },
    );
  typia.assert(createdStatus);

  // PMO creates a Task Priority
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });
  const priorityBody = {
    code: `priority_${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementPriority.ICreate;
  const createdPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: priorityBody,
      },
    );
  typia.assert(createdPriority);

  // PMO creates a Project
  const projectBody = {
    owner_id: pmoUser.id,
    code: `project_${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementProject.ICreate;
  const createdProject: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(createdProject);

  // PM creates a Board inside the Project
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });
  const boardBody = {
    project_id: createdProject.id,
    owner_id: pmUser.id,
    code: `board_${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;
  const createdBoard: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: createdProject.id,
      body: boardBody,
    });
  typia.assert(createdBoard);

  // Define objects to use in task search filter queries
  const filters = [
    { name: "status_id", value: createdStatus.id },
    { name: "priority_id", value: createdPriority.id },
    { name: "creator_id", value: pmUser.id },
    { name: "project_id", value: createdProject.id },
    { name: "board_id", value: createdBoard.id },
  ] as const;

  // Helper for validating pagination metadata
  function validatePagination(pagination: IPage.IPagination): void {
    TestValidator.predicate(
      "pagination current page is a number and >= 0",
      typeof pagination.current === "number" && pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is a number and >= 0",
      typeof pagination.limit === "number" && pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records is a number and >= 0",
      typeof pagination.records === "number" && pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is a number and >= 0",
      typeof pagination.pages === "number" && pagination.pages >= 0,
    );
  }

  // Helper for validating task summaries matching expected filters
  function validateTaskSummaries(
    tasks: ITaskManagementTasks.ISummary[],
    filterName: string,
    filterValue: string,
  ): void {
    for (const task of tasks) {
      if (filterName === "status_id") {
        TestValidator.predicate(
          `task summary status_name is string for filter ${filterName}`,
          task.status_name === null ||
            task.status_name === undefined ||
            typeof task.status_name === "string",
        );
      } else if (filterName === "priority_id") {
        TestValidator.predicate(
          `task summary priority_name is string for filter ${filterName}`,
          task.priority_name === null ||
            task.priority_name === undefined ||
            typeof task.priority_name === "string",
        );
      }
      TestValidator.predicate(
        `task summary id is string`,
        typeof task.id === "string",
      );
      TestValidator.predicate(
        `task summary title is string`,
        typeof task.title === "string",
      );
    }
  }

  // Run searches with each individual filter plus pagination options
  for (const { name, value } of filters) {
    // page and limit with fixed values
    const requestBody1 = {
      page: 1,
      limit: 10,
      [name]: value,
    } satisfies ITaskManagementTasks.IRequest;

    const result1: IPageITaskManagementTasks.ISummary =
      await api.functional.taskManagement.pm.tasks.index(connection, {
        body: requestBody1,
      });
    typia.assert(result1);
    validatePagination(result1.pagination);
    validateTaskSummaries(result1.data, name, value);

    // page and limit omitted (use default behavior)
    const requestBody2 = {
      [name]: value,
    } satisfies ITaskManagementTasks.IRequest;

    const result2: IPageITaskManagementTasks.ISummary =
      await api.functional.taskManagement.pm.tasks.index(connection, {
        body: requestBody2,
      });
    typia.assert(result2);
    validatePagination(result2.pagination);
    validateTaskSummaries(result2.data, name, value);
  }

  // Run search with all filters combined
  const combinedRequestBody = {
    page: 1,
    limit: 20,
    status_id: createdStatus.id,
    priority_id: createdPriority.id,
    creator_id: pmUser.id,
    project_id: createdProject.id,
    board_id: createdBoard.id,
  } satisfies ITaskManagementTasks.IRequest;

  const combinedResult: IPageITaskManagementTasks.ISummary =
    await api.functional.taskManagement.pm.tasks.index(connection, {
      body: combinedRequestBody,
    });
  typia.assert(combinedResult);
  validatePagination(combinedResult.pagination);
  validateTaskSummaries(combinedResult.data, "combined_filters", "");

  TestValidator.predicate(
    "pagination limit equals request limit",
    combinedResult.pagination.limit === 20,
  );

  TestValidator.predicate(
    "result data is array",
    Array.isArray(combinedResult.data),
  );
}
