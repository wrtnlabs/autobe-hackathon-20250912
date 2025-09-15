import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_task_developer_task_list_filter_pagination(
  connection: api.IConnection,
) {
  // 1. TPM user join and login
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmJoinBody = {
    email: tpmEmail,
    password: "StrongPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  const tpmLoginBody = {
    email: tpmEmail,
    password: "StrongPass123!",
  } satisfies ITaskManagementTpm.ILogin;
  const tpmLogin = await api.functional.auth.tpm.login(connection, {
    body: tpmLoginBody,
  });
  typia.assert(tpmLogin);

  // 2. PMO user join and login
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoJoinBody = {
    email: pmoEmail,
    password: "StrongPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser = await api.functional.auth.pmo.join(connection, {
    body: pmoJoinBody,
  });
  typia.assert(pmoUser);

  const pmoLoginBody = {
    email: pmoEmail,
    password: "StrongPass123!",
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLogin = await api.functional.auth.pmo.login(connection, {
    body: pmoLoginBody,
  });
  typia.assert(pmoLogin);

  // 3. Developer user join and login
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerJoinBody = {
    email: developerEmail,
    password_hash: "hashedPassword1234567890",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDeveloper.ICreate;
  const developerUser = await api.functional.auth.developer.join(connection, {
    body: developerJoinBody,
  });
  typia.assert(developerUser);

  const developerLoginBody = {
    email: developerEmail,
    password: "hashedPassword1234567890",
  } satisfies ITaskManagementDeveloper.ILogin;
  const developerLogin = await api.functional.auth.developer.login(connection, {
    body: developerLoginBody,
  });
  typia.assert(developerLogin);

  // 4. TPM creates a task status
  await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  const statusCreateBody = {
    code: `status_${RandomGenerator.alphaNumeric(6)}`,
    name: `Status ${RandomGenerator.name(1)}`,
    description: "Status description for testing",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(taskStatus);

  // 5. PMO creates a task priority
  await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  const priorityCreateBody = {
    code: `priority_${RandomGenerator.alphaNumeric(6)}`,
    name: `Priority ${RandomGenerator.name(1)}`,
    description: "Priority description for testing",
  } satisfies ITaskManagementPriority.ICreate;
  const priority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      { body: priorityCreateBody },
    );
  typia.assert(priority);

  // 6. PMO creates a project owned by TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: `project_${RandomGenerator.alphaNumeric(6)}`,
    name: `Project ${RandomGenerator.name(1)}`,
    description: "Project description for testing",
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.pmo.projects.create(
    connection,
    { body: projectCreateBody },
  );
  typia.assert(project);

  // 7. TPM creates a board under the project, owned by TPM user
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `board_${RandomGenerator.alphaNumeric(6)}`,
    name: `Board ${RandomGenerator.name(1)}`,
    description: "Board description for testing",
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    { projectId: project.id, body: boardCreateBody },
  );
  typia.assert(board);

  // 8. Switch to developer user session
  await api.functional.auth.developer.login(connection, {
    body: developerLoginBody,
  });

  // 9. Developer requests filtered and paginated list of tasks
  const requestBody = {
    page: 1,
    limit: 10,
    status_id: taskStatus.id,
    priority_id: priority.id,
    creator_id: developerUser.id,
    project_id: project.id,
    board_id: board.id,
    sort_by: null,
    sort_order: null,
    search: null,
  } satisfies ITaskManagementTasks.IRequest;

  const taskListResponse: IPageITaskManagementTasks.ISummary =
    await api.functional.taskManagement.developer.tasks.index(connection, {
      body: requestBody,
    });
  typia.assert(taskListResponse);

  // 10. Validate pagination info
  TestValidator.predicate(
    "pagination current page should be 1",
    taskListResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    taskListResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    taskListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    taskListResponse.pagination.pages >= 0,
  );

  // 11. Validate that each task matches filter criteria
  for (const task of taskListResponse.data) {
    if (task.status_name !== null && task.status_name !== undefined) {
      TestValidator.predicate(
        "task status_name matches filter",
        task.status_name === taskStatus.name,
      );
    }
    if (task.priority_name !== null && task.priority_name !== undefined) {
      TestValidator.predicate(
        "task priority_name matches filter",
        task.priority_name === priority.name,
      );
    }
  }
}
