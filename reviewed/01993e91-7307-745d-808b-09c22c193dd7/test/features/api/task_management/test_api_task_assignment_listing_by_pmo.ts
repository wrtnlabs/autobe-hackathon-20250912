import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_assignment_listing_by_pmo(
  connection: api.IConnection,
) {
  // 1. Register and login PMO user
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoAuth: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoAuth);

  // 2. Register and login TPM user
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmAuth: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmAuth);

  // 3. Creating a task status
  const taskStatusBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusBody },
    );
  typia.assert(taskStatus);

  // 4. Creating a task priority
  const taskPriorityBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: taskPriorityBody },
    );
  typia.assert(taskPriority);

  // 5. Creating a project
  const projectBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 6. Creating a board under the project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 7. Creating a task associated with above resources
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph(),
    status_name: taskStatus.name,
    priority_name: taskPriority.name,
    due_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 8. Switch to PMO user to list assignments
  await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });

  // 9. List assignments for task - verify structure and contents
  const assignments: ITaskManagementTaskAssignmentArray =
    await api.functional.taskManagement.pmo.tasks.assignments.indexTaskAssignments(
      connection,
      { taskId: task.id },
    );
  typia.assert(assignments);

  // Optional: Verify assignment entries correspond to given task
  if (assignments.data.length > 0) {
    for (const assignment of assignments.data) {
      TestValidator.predicate(
        "each assignment taskId equals query taskId",
        assignment.task_id === task.id,
      );
      typia.assert<ITaskManagementTaskAssignment>(assignment);
    }
  }

  // 10. Negative test: list assignments for non-existent task (expect failure)
  await TestValidator.error(
    "non-existent task assignment listing fails",
    async () => {
      await api.functional.taskManagement.pmo.tasks.assignments.indexTaskAssignments(
        connection,
        { taskId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 11. Negative test: unauthorized access (simulate by logging out, empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized task assignment listing fails",
    async () => {
      await api.functional.taskManagement.pmo.tasks.assignments.indexTaskAssignments(
        unauthConn,
        { taskId: task.id },
      );
    },
  );
}
