import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

/**
 * This test validates the complete creation workflow under the PM role
 * permissions.
 *
 * It performs the following sequential steps:
 *
 * 1. Register a PM user; 2) Register a PMO user;
 * 2. Login PM and PMO users;
 * 3. Create a task status;
 * 4. Create a task priority;
 * 5. Create a project owned by PM user;
 * 6. Create a board inside that project owned by PM;
 * 7. Create a task referencing all previously created entities.
 *
 * The test asserts the validity and linkage of each created entity and
 * ensures authorization compliance and data integrity.
 *
 * It uses typia.assert for strict type runtime validation and TestValidator
 * for field comparison assertions.
 *
 * The test also ensures usage of realistic random data respecting format
 * constraints.
 */
export async function test_api_task_creation_full_dependencies_for_pm_role(
  connection: api.IConnection,
) {
  // 1. Register PM user
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = RandomGenerator.alphaNumeric(12);
  const createPmBody = {
    email: pmEmail,
    password: pmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pm = await api.functional.auth.pm.join(connection, {
    body: createPmBody,
  });
  typia.assert(pm);

  // 2. Register PMO user
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = RandomGenerator.alphaNumeric(12);
  const createPmoBody = {
    email: pmoEmail,
    password: pmoPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmo = await api.functional.auth.pmo.join(connection, {
    body: createPmoBody,
  });
  typia.assert(pmo);

  // 3. Login PM user
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 4. Login PMO user
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 5. Create task status entity
  const statusCode = RandomGenerator.alphabets(8);
  const createStatusBody = {
    code: statusCode,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const status =
    await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
      connection,
      {
        body: createStatusBody,
      },
    );
  typia.assert(status);

  // 6. Create task priority entity
  const priorityCode = RandomGenerator.alphabets(6);
  const createPriorityBody = {
    code: priorityCode,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPriority.ICreate;
  const priority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: createPriorityBody,
      },
    );
  typia.assert(priority);

  // 7. Login PM user again for project and board creation
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 8. Create project owned by PM user
  const projectCode = RandomGenerator.alphabets(8);
  const createProjectBody = {
    owner_id: pm.id,
    code: projectCode,
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.pm.projects.create(
    connection,
    {
      body: createProjectBody,
    },
  );
  typia.assert(project);

  // 9. Create board inside project owned by PM
  const boardCode = RandomGenerator.alphabets(6);
  const createBoardBody = {
    project_id: project.id,
    owner_id: pm.id,
    code: boardCode,
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.pm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: createBoardBody,
    },
  );
  typia.assert(board);

  // 10. Create task referencing all prior created entities
  const createTaskBody = {
    status_id: status.id,
    priority_id: priority.id,
    creator_id: pm.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.pm.tasks.create(connection, {
    body: createTaskBody,
  });
  typia.assert(task);

  // Validate proper linkage
  TestValidator.equals("task status_id matches", task.status_id, status.id);
  TestValidator.equals(
    "task priority_id matches",
    task.priority_id,
    priority.id,
  );
  TestValidator.equals("task creator_id matches", task.creator_id, pm.id);
  TestValidator.equals("task project_id matches", task.project_id, project.id);
  TestValidator.equals("task board_id matches", task.board_id, board.id);
}
