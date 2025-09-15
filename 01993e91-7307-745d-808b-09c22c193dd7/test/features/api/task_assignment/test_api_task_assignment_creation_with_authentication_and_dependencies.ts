import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-end test to validate TPM user creation, authentication, and full
 * dependency chain creation for task assignments.
 *
 * This test covers:
 *
 * 1. TPM user registration and token assertion
 * 2. Creation of task management role
 * 3. Creation of task status
 * 4. Creation of task priority
 * 5. Creation of project
 * 6. Creation of board within project
 * 7. Creation of task with project and board associations
 * 8. Assignment of the created task to the TPM user
 *
 * Each step involves API calls with correct request bodies and response
 * validation. The test verifies linkage of entities and proper assignment
 * timestamps.
 *
 * All required properties are provided, and results type-asserted via
 * typia.assert.
 */
export async function test_api_task_assignment_creation_with_authentication_and_dependencies(
  connection: api.IConnection,
) {
  // 1. TPM user registration
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(tpmUser);

  // 2. Create Task Management Role
  const roleCreateBody = {
    code: `R${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    name: `Role_${RandomGenerator.alphaNumeric(3)}`,
    description: `Automated role creation for testing - ${new Date().toISOString()}`,
  } satisfies ITaskManagementTaskManagementRoles.ICreate;
  const role =
    await api.functional.taskManagement.tpm.taskManagementRoles.create(
      connection,
      { body: roleCreateBody },
    );
  typia.assert(role);

  // 3. Create Task Status
  const taskStatusCreateBody = {
    code: `status_${RandomGenerator.alphaNumeric(4)}`,
    name: `Status ${RandomGenerator.name(2)}`,
    description: "Test status creation",
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusCreateBody },
    );
  typia.assert(taskStatus);

  // 4. Create Task Priority
  const priorityCreateBody = {
    code: `priority_${RandomGenerator.alphaNumeric(3)}`,
    name: `Priority ${RandomGenerator.name(2)}`,
    description: "Test priority creation",
  } satisfies ITaskManagementPriority.ICreate;
  const priority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityCreateBody },
    );
  typia.assert(priority);

  // 5. Create Project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: `P${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: `Project_${RandomGenerator.alphaNumeric(3)}`,
    description: "Automated project created for task assignment testing",
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    { body: projectCreateBody },
  );
  typia.assert(project);

  // 6. Create Board in Project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `B${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: `Board_${RandomGenerator.alphaNumeric(3)}`,
    description: "Automated board for testing",
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 7. Create Task linked to Project and Board
  const taskCreateBody = {
    status_id: taskStatus.id,
    priority_id: priority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: `Task ${RandomGenerator.alphaNumeric(3)}`,
    description: "Automated task creation",
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    { body: taskCreateBody },
  );
  typia.assert(task);

  // 8. Create Task Assignment assigning the task to the TPM User
  const assignmentCreateBody = {
    task_id: task.id,
    assignee_id: tpmUser.id,
    assigned_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskAssignment.ICreate;
  const assignment =
    await api.functional.taskManagement.tpm.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);
  TestValidator.predicate(
    "Assignment task_id matches created task",
    assignment.task_id === task.id,
  );
  TestValidator.predicate(
    "Assignment assignee_id matches TPM user id",
    assignment.assignee_id === tpmUser.id,
  );
}
