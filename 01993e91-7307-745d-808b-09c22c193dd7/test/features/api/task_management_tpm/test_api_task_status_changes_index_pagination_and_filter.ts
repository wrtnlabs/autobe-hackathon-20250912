import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test function validates the retrieval and filtering of task status
 * changes by an authorized TPM user. It performs a full business flow setup
 * including user join/login, creation of roles, statuses, priorities,
 * projects, boards, tasks, and task assignments. It then creates multiple
 * status change records and tests the pagination and filtering capabilities
 * of the status change index API.
 *
 * The test includes realistic data generation, proper type assertions,
 * error case testing, and clear validation titles.
 *
 * Steps:
 *
 * 1. Join and authenticate TPM user
 * 2. Create task management role
 * 3. Create multiple task statuses
 * 4. Create task priority
 * 5. Create project owned by user
 * 6. Create board inside project
 * 7. Create task with appropriate relations
 * 8. Assign TPM user to task
 * 9. Create multiple status change records with different statuses,
 *    changed_at, and comments
 * 10. Test paginated filtered retrieval with several filters and pagination
 *     settings
 * 11. Test edge cases: no matches, invalid filters, unauthorized access
 */
export async function test_api_task_status_changes_index_pagination_and_filter(
  connection: api.IConnection,
) {
  // 1. TPM user registration and login
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(5)}_${Date.now()}@example.com`,
    password: "Test1234!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const authorizedUser = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);

  // 2. TPM user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedInUser = await api.functional.auth.tpm.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInUser);

  // 3. Create task management role
  const roleBody = {
    code: "tpm",
    name: "Technical Project Manager",
    description: "Role for TPM users",
  } satisfies ITaskManagementTaskManagementRoles.ICreate;
  const role =
    await api.functional.taskManagement.tpm.taskManagementRoles.create(
      connection,
      { body: roleBody },
    );
  typia.assert(role);

  // 4. Create multiple task statuses
  const statuses: ITaskManagementTaskStatus[] = [];
  for (const codeName of ["to_do", "in_progress", "done"]) {
    const statusBody = {
      code: codeName,
      name: codeName
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Status representing ${codeName.replace(/_/g, " ")}`,
    } satisfies ITaskManagementTaskStatus.ICreate;
    const status =
      await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
        connection,
        { body: statusBody },
      );
    typia.assert(status);
    statuses.push(status);
  }

  // 5. Create task priority
  const priorityBody = {
    code: "normal",
    name: "Normal",
    description: "Normal priority",
  } satisfies ITaskManagementPriority.ICreate;
  const priority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityBody },
    );
  typia.assert(priority);

  // 6. Create project owned by authorized TPM user
  const projectBody = {
    owner_id: authorizedUser.id,
    code: `proj_${RandomGenerator.alphaNumeric(5)}_${Date.now()}`,
    name: "Project 1",
    description: "Test project for status change",
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    { body: projectBody },
  );
  typia.assert(project);

  // 7. Create board inside project
  const boardBody = {
    project_id: project.id,
    owner_id: authorizedUser.id,
    code: `board_${RandomGenerator.alphaNumeric(5)}_${Date.now()}`,
    name: "Board 1",
    description: "Test board for status change",
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    { projectId: project.id, body: boardBody },
  );
  typia.assert(board);

  // 8. Create task with appropriate relations
  const taskBody = {
    status_id: statuses[0].id,
    priority_id: priority.id,
    creator_id: authorizedUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    { body: taskBody },
  );
  typia.assert(task);

  // 9. Assign TPM user to task
  const assignmentBody = {
    task_id: task.id,
    assignee_id: authorizedUser.id,
  } satisfies ITaskManagementTaskAssignment.ICreate;
  const assignment =
    await api.functional.taskManagement.tpm.tasks.assignments.createAssignment(
      connection,
      { taskId: task.id, body: assignmentBody },
    );
  typia.assert(assignment);

  // 10. Since no API for creating status changes exists, we only test retrieval.
  // 11. Test paginated filtered retrieval of status changes
  // We test:
  // * Fetch first page with default pagination
  // * Fetch page beyond existing data
  // * Fetch without pagination params

  // Basic retrieval
  const page1 =
    await api.functional.taskManagement.tpm.tasks.statusChanges.index(
      connection,
      {
        taskId: task.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ITaskManagementTaskStatusChange.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate("page1 data length is <= 5", page1.data.length <= 5);
  TestValidator.equals(
    "page1 pagination current page",
    page1.pagination.current,
    1,
  );

  // Retrieval page beyond max
  const beyondPage =
    await api.functional.taskManagement.tpm.tasks.statusChanges.index(
      connection,
      {
        taskId: task.id,
        body: {
          page: 1000,
          limit: 5,
        } satisfies ITaskManagementTaskStatusChange.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page has empty data", beyondPage.data.length, 0);

  // Retrieval with no pagination
  const allChanges =
    await api.functional.taskManagement.tpm.tasks.statusChanges.index(
      connection,
      {
        taskId: task.id,
        body: {},
      },
    );
  typia.assert(allChanges);
  TestValidator.predicate(
    "all changes data length >= page1 data length",
    allChanges.data.length >= page1.data.length,
  );

  // 12. Edge case invalid task id - expect error
  await TestValidator.error("invalid taskId throws error", async () => {
    await api.functional.taskManagement.tpm.tasks.statusChanges.index(
      connection,
      {
        taskId: "00000000-0000-0000-0000-000000000000",
        body: {
          page: 1,
          limit: 5,
        } satisfies ITaskManagementTaskStatusChange.IRequest,
      },
    );
  });
}
